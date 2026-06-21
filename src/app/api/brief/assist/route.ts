import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { getProjectForUser } from "@/server/threads";
import { roleAtLeast } from "@/server/auth/access";
import {
  aiConfiguredForOrg,
  resolveModelForOrg,
} from "@/server/ai/providers";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import { INTAKE_FIELDS } from "@/server/intake/questions";

export const maxDuration = 30;

/**
 * Drafts a friendly, concrete answer to a single brief question for someone who
 * isn't a marketing expert. If they jotted a rough note, it polishes that;
 * otherwise it infers a sensible first draft from what they've already shared.
 * Always returns plain answer text the user can edit before saving.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { projectId, fieldId, draft } = (await req.json()) as {
    projectId?: string;
    fieldId?: string;
    draft?: string;
  };
  if (!projectId || !fieldId) {
    return new Response("Missing projectId or fieldId", { status: 400 });
  }

  const ctx = await getProjectForUser(userId, projectId);
  if (!ctx) return new Response("Not found", { status: 404 });
  if (!roleAtLeast(ctx.role, "editor")) {
    return new Response("Forbidden", { status: 403 });
  }

  const field = INTAKE_FIELDS.find((f) => f.id === fieldId);
  if (!field) return new Response("Unknown field", { status: 400 });

  const orgId = ctx.brand.orgId;
  if (!(await aiConfiguredForOrg(orgId))) {
    return Response.json(
      { error: "No AI provider configured. Add one on the AI tab first." },
      { status: 503 },
    );
  }

  const answers = await getIntakeAnswers(projectId);
  const known = formatBriefForPrompt(answers);
  const rough = (draft ?? "").trim();

  const system = [
    "You help a small-business owner who is NOT a marketing expert fill in their marketing brief.",
    `They run "${ctx.brand.name}" and this brief is for the project "${ctx.project.name}".`,
    "Write a warm, plain-English first-draft answer to ONE question that they can accept or tweak.",
    "Be concrete and specific, written in their first-person voice. No jargon, no preamble, no quotes, no markdown headings — just the answer text itself.",
    "Keep it to 1–4 short sentences (or a short list if the question asks for one).",
    "Only use facts you can reasonably infer from what they've told you; if you must assume something, keep it generic and safe rather than inventing specifics.",
  ].join(" ");

  const prompt = [
    known
      ? `Here is what they've already shared in the brief:\n\n${known}\n`
      : "They haven't filled in much of the brief yet.\n",
    `\nThe question to answer is: "${field.label}"`,
    field.help ? `\nWhat it means: ${field.help}` : "",
    field.example ? `\nAn example of a good answer: ${field.example}` : "",
    rough
      ? `\n\nThey jotted this rough note — turn it into a clear, finished answer:\n"${rough}"`
      : `\n\nDraft a helpful first answer for them based on what you know. If you really can't tell, give a simple fill-in-the-blank starter they can complete.`,
    "\n\nWrite only the answer:",
  ].join("");

  try {
    const { text } = await generateText({
      model: await resolveModelForOrg(orgId, "default"),
      system,
      prompt,
    });
    return Response.json({ text: text.trim() });
  } catch (e) {
    const err = e as { message?: string };
    return Response.json(
      { error: err.message ?? "Could not draft an answer." },
      { status: 502 },
    );
  }
}
