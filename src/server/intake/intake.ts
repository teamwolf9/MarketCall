import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projectIntake } from "@/server/db/schema";
import {
  visibleSections,
  visibleFields,
  type IntakeAnswers,
} from "./questions";

/** Saved answers for a project (empty map if the brief hasn't been started). */
export async function getIntakeAnswers(projectId: string): Promise<IntakeAnswers> {
  const row = await db.query.projectIntake.findFirst({
    where: eq(projectIntake.projectId, projectId),
  });
  return row?.answers ?? {};
}

/** Upsert the whole answer map for a project. */
export async function saveIntakeAnswers(
  projectId: string,
  answers: IntakeAnswers,
): Promise<void> {
  await db
    .insert(projectIntake)
    .values({ projectId, answers, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: projectIntake.projectId,
      set: { answers, updatedAt: new Date() },
    });
}

export type IntakeStats = {
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  pct: number;
};

export function intakeStats(answers: IntakeAnswers): IntakeStats {
  const filled = (id: string) => (answers[id] ?? "").trim().length > 0;
  // Only count questions actually shown for this project type.
  const fields = visibleFields(answers);
  const total = fields.length;
  const answered = fields.filter((f) => filled(f.id)).length;
  const required = fields.filter((f) => f.required);
  return {
    total,
    answered,
    requiredTotal: required.length,
    requiredAnswered: required.filter((f) => filled(f.id)).length,
    pct: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

export function briefIsEmpty(answers: IntakeAnswers): boolean {
  return visibleFields(answers).every((f) => !(answers[f.id] ?? "").trim());
}

/**
 * Render the answered parts of the brief as a compact markdown block for the
 * orchestrator to inject into every specialist's system prompt. Only includes
 * answered fields so we never feed the model empty scaffolding.
 */
export function formatBriefForPrompt(answers: IntakeAnswers): string {
  const blocks: string[] = [];
  for (const section of visibleSections(answers)) {
    const lines = section.fields
      .filter((f) => (answers[f.id] ?? "").trim())
      .map((f) => `- ${f.label}: ${answers[f.id].trim()}`);
    if (lines.length) blocks.push(`## ${section.title}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}
