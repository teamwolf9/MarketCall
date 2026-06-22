import "server-only";
import { and, asc, eq, lte } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/server/db";
import {
  automations,
  projects,
  brands,
  type Automation,
  type AutomationCadence,
} from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";
import { resolveModelForOrg, aiConfiguredForOrg } from "@/server/ai/providers";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import { createDeliverable } from "@/server/deliverables";

/**
 * Autonomous agents: each automation runs its goal on a cadence and produces a
 * deliverable. CRUD is access-checked (editor+ to change); the runner is
 * internal — invoked by the /api/cron scheduler with no user, since it runs
 * detached from any request.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function intervalMs(cadence: AutomationCadence): number {
  return cadence === "daily" ? DAY_MS : 7 * DAY_MS;
}

// --- User-facing, access-checked --------------------------------------------

export async function listAutomations(
  userId: string,
  projectId: string,
): Promise<Automation[] | null> {
  if (!(await projectRole(userId, projectId))) return null;
  return db
    .select()
    .from(automations)
    .where(eq(automations.projectId, projectId))
    .orderBy(asc(automations.createdAt));
}

export async function createAutomation(
  userId: string,
  projectId: string,
  goal: string,
  cadence: AutomationCadence,
): Promise<Automation | null> {
  if (!roleAtLeast(await projectRole(userId, projectId), "editor")) return null;
  const nextRunAt = new Date(Date.now() + intervalMs(cadence));
  const [row] = await db
    .insert(automations)
    .values({ projectId, goal, cadence, createdByUserId: userId, nextRunAt })
    .returning();
  return row;
}

async function automationIfCanEdit(
  userId: string,
  automationId: string,
): Promise<Automation | null> {
  const a = await db.query.automations.findFirst({
    where: eq(automations.id, automationId),
  });
  if (!a) return null;
  if (!roleAtLeast(await projectRole(userId, a.projectId), "editor")) return null;
  return a;
}

export async function setAutomationEnabled(
  userId: string,
  automationId: string,
  enabled: boolean,
): Promise<boolean> {
  const a = await automationIfCanEdit(userId, automationId);
  if (!a) return false;
  await db
    .update(automations)
    .set({ enabled })
    .where(eq(automations.id, automationId));
  return true;
}

export async function deleteAutomation(
  userId: string,
  automationId: string,
): Promise<boolean> {
  const a = await automationIfCanEdit(userId, automationId);
  if (!a) return false;
  await db.delete(automations).where(eq(automations.id, automationId));
  return true;
}

/** Run an automation immediately (the "Run now" button). Editor+. */
export async function runAutomationNow(
  userId: string,
  automationId: string,
): Promise<boolean> {
  const a = await automationIfCanEdit(userId, automationId);
  if (!a) return false;
  await runAutomation(a);
  return true;
}

// --- Internal runner (scheduler / worker) -----------------------------------

/** Run one automation: generate a deliverable from its goal, reschedule it. */
async function runAutomation(a: Automation): Promise<void> {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, a.projectId),
    });
    if (!project || !a.createdByUserId) return;
    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, project.brandId),
    });
    if (!brand || !(await aiConfiguredForOrg(brand.orgId))) return;

    const brief = formatBriefForPrompt(await getIntakeAnswers(a.projectId));
    const model = await resolveModelForOrg(brand.orgId, "smart");
    const today = new Date().toISOString().slice(0, 10);
    const { text } = await generateText({
      model,
      prompt:
        `Brand: ${brand.name}. Project: ${project.name}. Today is ${today}.` +
        (brief.trim() ? `\n\nBrand brief:\n${brief.trim()}` : "") +
        `\n\nYou are an autonomous marketing agent running on a schedule. Do this ` +
        `now and produce a concrete, ready-to-use deliverable in clean markdown ` +
        `(no preamble): ${a.goal}`,
    });

    await createDeliverable(a.createdByUserId, {
      projectId: a.projectId,
      title: `${a.goal} — ${today}`,
      kind: "plan",
      content: text.trim(),
    });
  } catch (err) {
    console.error("automation run failed:", err);
  } finally {
    // Reschedule regardless, so one failure doesn't wedge the cadence.
    const next = new Date(Date.now() + intervalMs(a.cadence));
    await db
      .update(automations)
      .set({ lastRunAt: new Date(), nextRunAt: next })
      .where(eq(automations.id, a.id));
  }
}

/** Run every enabled automation that's due. Called by the scheduler. */
export async function runDueAutomations(): Promise<number> {
  const due = await db
    .select()
    .from(automations)
    .where(and(eq(automations.enabled, true), lte(automations.nextRunAt, new Date())));
  for (const a of due) {
    await runAutomation(a);
  }
  return due.length;
}
