import "server-only";
import { generateText } from "ai";
import TurndownService from "turndown";
import { getDeliverableForUser } from "@/server/deliverables";
import { resolveModelForOrg } from "@/server/ai/providers";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { kindLabel } from "@/lib/deliverables";
import { looksLikeHtml } from "@/lib/deliverable-content";

/**
 * Multi-agent quality pass over a deliverable: a critic agent finds concrete
 * weaknesses, then an editor agent rewrites a stronger, on-brand version that
 * addresses them. Two passes beat one — the critique forces specifics the
 * rewrite then has to fix. Returns improved markdown for the editor to load.
 */
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export type RefineResult =
  | { ok: true; markdown: string; critique: string }
  | { ok: false; error: string };

export async function refineDeliverable(
  userId: string,
  deliverableId: string,
): Promise<RefineResult> {
  const found = await getDeliverableForUser(userId, deliverableId);
  if (!found) return { ok: false, error: "Not found." };
  if (!roleAtLeast(found.ctx.role, "editor")) {
    return { ok: false, error: "You need editor access to refine this." };
  }
  const { deliverable, ctx } = found;
  const source = looksLikeHtml(deliverable.content)
    ? turndown.turndown(deliverable.content)
    : deliverable.content;
  if (!source.trim()) {
    return { ok: false, error: "There's nothing to refine yet." };
  }

  try {
    const orgId = ctx.brand.orgId;
    const brief = formatBriefForPrompt(await getIntakeAnswers(ctx.project.id));
    const label = kindLabel(deliverable.kind);
    const context =
      `Brand: ${ctx.brand.name}. This is a "${label}" deliverable.` +
      (brief.trim() ? `\n\nBrand brief:\n${brief.trim()}` : "");

    // 1) Critic — find concrete, specific weaknesses.
    const critic = await resolveModelForOrg(orgId, "smart");
    const { text: critique } = await generateText({
      model: critic,
      prompt:
        `${context}\n\nYou are a demanding marketing editor. Critique the ${label} below. ` +
        `List the 5 most important, concrete weaknesses — vague claims, weak hooks, ` +
        `off-brand voice, missing specifics, poor structure — and exactly what would ` +
        `make each stronger and more effective. Be specific; no praise.\n\n` +
        `--- ${label} ---\n${source}`,
    });

    // 2) Editor — rewrite a stronger version addressing the critique.
    const editor = await resolveModelForOrg(orgId, "smart");
    const { text: improved } = await generateText({
      model: editor,
      prompt:
        `${context}\n\nRewrite and improve the ${label} below so it addresses every ` +
        `point in the critique while staying true to the brand brief. Keep what works, ` +
        `sharpen the rest, stay concrete and on-voice. Return ONLY the improved ` +
        `${label} as clean markdown — no preamble, no commentary.\n\n` +
        `--- Critique ---\n${critique}\n\n--- Current ${label} ---\n${source}`,
    });

    const markdown = improved.trim();
    if (!markdown) return { ok: false, error: "The refine pass returned nothing." };
    return { ok: true, markdown, critique: critique.trim() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refine failed.",
    };
  }
}
