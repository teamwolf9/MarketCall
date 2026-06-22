import "server-only";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, brands } from "@/server/db/schema";
import { resolveModelForOrg } from "@/server/ai/providers";
import { createDeliverable } from "@/server/deliverables";
import { createEvent } from "@/server/calendar";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import {
  loadJob,
  markRunning,
  setProgress,
  completeJob,
  failJob,
} from "@/server/jobs";

/**
 * The campaign generator — a long, multi-step agent run: strategy → content
 * calendar → ad copy, each its own model call, persisting real artifacts
 * (deliverables + calendar events) as it goes. Too long for one chat request,
 * so it runs as a durable job. Detached from any request: it loads its own
 * context and advances the job row; the UI polls. Any failure marks the job
 * failed with a message rather than throwing into the void.
 */

/** Pull the first JSON array out of a model reply, tolerating prose/fences. */
function parseJsonArray(text: string): unknown[] {
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const val = JSON.parse(fenced.slice(start, end + 1));
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

/** Parse a model date; date-only → local midnight (matches the calendar tool). */
function parseEventDate(value: unknown): { date: Date; allDay: boolean } | null {
  if (typeof value !== "string") return null;
  const hasTime = /T\d/.test(value);
  const d = new Date(hasTime ? value : `${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : { date: d, allDay: !hasTime };
}

export async function runCampaignJob(jobId: string): Promise<void> {
  const job = await loadJob(jobId);
  if (!job || job.status !== "queued" || !job.createdByUserId) return;
  const userId = job.createdByUserId;

  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, job.projectId),
    });
    if (!project) throw new Error("Project not found.");
    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, project.brandId),
    });
    if (!brand) throw new Error("Brand not found.");

    const brief = formatBriefForPrompt(await getIntakeAnswers(job.projectId));
    const model = await resolveModelForOrg(brand.orgId, "smart");
    const today = new Date().toISOString().slice(0, 10);
    const context =
      `Brand: ${brand.name}. Project: ${project.name}. Today is ${today}.` +
      (brief.trim() ? `\n\nProject brief:\n${brief.trim()}` : "") +
      `\n\nCampaign goal: ${job.goal}`;

    await markRunning(jobId);
    const deliverableIds: string[] = [];

    // 1) Strategy
    await setProgress(jobId, 15, "Planning strategy");
    const strategy = await generateText({
      model,
      prompt:
        `${context}\n\nWrite a concise campaign strategy in markdown: objective, ` +
        `target audience, key message, channels, and a phased timeline. Be specific and on-brand.`,
    });
    const strategyDoc = await createDeliverable(userId, {
      projectId: job.projectId,
      title: `${job.goal} — Strategy`,
      kind: "plan",
      content: strategy.text.trim(),
    });
    if (strategyDoc) deliverableIds.push(strategyDoc.id);

    // 2) Content calendar → real calendar events
    await setProgress(jobId, 45, "Building content calendar");
    const cal = await generateText({
      model,
      prompt:
        `${context}\n\nBased on that strategy, propose 6 content calendar items for the ` +
        `next 3 weeks. Reply with ONLY a JSON array, each item: ` +
        `{"title": string, "date": "YYYY-MM-DD", "channel": string, "notes": string}. ` +
        `Spread the dates realistically starting after ${today}. No prose, no code fences.`,
    });
    let eventCount = 0;
    for (const raw of parseJsonArray(cal.text)) {
      const item = raw as Record<string, unknown>;
      const when = parseEventDate(item.date);
      if (!when || typeof item.title !== "string") continue;
      const ev = await createEvent(userId, {
        projectId: job.projectId,
        title: item.title,
        channel: typeof item.channel === "string" ? item.channel : null,
        notes: typeof item.notes === "string" ? item.notes : null,
        startsAt: when.date,
        allDay: when.allDay,
      });
      if (ev) eventCount++;
    }

    // 3) Ad copy
    await setProgress(jobId, 75, "Writing ad copy");
    const adCopy = await generateText({
      model,
      prompt:
        `${context}\n\nWrite ad copy for this campaign in markdown: 3 headline + primary-text ` +
        `variants each for Meta and Google, with clear CTAs. Note the angle behind each variant.`,
    });
    const adDoc = await createDeliverable(userId, {
      projectId: job.projectId,
      title: `${job.goal} — Ad Copy`,
      kind: "ad_copy",
      content: adCopy.text.trim(),
    });
    if (adDoc) deliverableIds.push(adDoc.id);

    await setProgress(jobId, 95, "Finishing up");
    await completeJob(jobId, {
      deliverableIds,
      eventCount,
      summary: `Created ${deliverableIds.length} deliverables and ${eventCount} calendar events.`,
    });
  } catch (err) {
    await failJob(jobId, err instanceof Error ? err.message : "Campaign run failed.");
  }
}
