import "server-only";
import { generateText } from "ai";
import { resolveModelForOrg } from "@/server/ai/providers";
import {
  SPECIALISTS,
  DEFAULT_SPECIALIST,
  type SpecialistKey,
} from "@/server/ai/specialists";

/**
 * The orchestrator routes a request to one specialist. It uses the org's *fast*
 * model for a cheap one-token classification, then the chat runs the chosen
 * specialist with its own preferred model — so routing and the actual work can
 * run on different models. Any failure falls back to the Strategist, so chat
 * never breaks on a routing hiccup.
 */
export async function routeToSpecialist(
  orgId: string,
  userText: string,
): Promise<SpecialistKey> {
  const keys = Object.keys(SPECIALISTS) as SpecialistKey[];
  if (!userText.trim()) return DEFAULT_SPECIALIST;

  try {
    const model = await resolveModelForOrg(orgId, "fast");
    const list = keys
      .map((k) => `- ${k}: ${SPECIALISTS[k].blurb}`)
      .join("\n");
    const { text } = await generateText({
      model,
      prompt:
        `Route this marketing request to exactly one specialist. ` +
        `Reply with ONLY the specialist key, nothing else.\n\n` +
        `Specialists:\n${list}\n\nRequest: "${userText}"\n\nKey:`,
    });
    const picked = text.trim().toLowerCase().replace(/[^a-z_]/g, "");
    return keys.find((k) => picked.includes(k)) ?? DEFAULT_SPECIALIST;
  } catch {
    return DEFAULT_SPECIALIST;
  }
}
