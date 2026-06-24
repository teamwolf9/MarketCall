import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getDeliverableForUser } from "@/server/deliverables";
import { roleAtLeast } from "@/server/auth/access";
import {
  aiConfiguredForOrg,
  resolveModelForOrg,
  modelLabelForOrg,
} from "@/server/ai/providers";
import { routeToSpecialist } from "@/server/ai/orchestrator";
import { SPECIALISTS } from "@/server/ai/specialists";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import { getBrandGuide, formatBrandGuideForPrompt } from "@/server/brand-guide";
import { kindLabel } from "@/lib/deliverables";

export const maxDuration = 30;

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

/**
 * Context-aware chat about a single deliverable. The assistant sees the current
 * document (sent live from the editor) plus the brand brief and design system,
 * and helps draft/rewrite/critique it. Ephemeral — this conversation isn't
 * persisted as a thread; it's a working sidebar.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { deliverableId } = await params;
  const { messages, document } = (await req.json()) as {
    messages: UIMessage[];
    document?: string;
  };

  const found = await getDeliverableForUser(userId, deliverableId);
  if (!found) return new Response("Not found", { status: 404 });
  const { deliverable, ctx } = found;
  if (!roleAtLeast(ctx.role, "editor")) {
    return new Response("Forbidden", { status: 403 });
  }

  const orgId = ctx.brand.orgId;
  if (!(await aiConfiguredForOrg(orgId))) {
    return Response.json(
      { error: "No AI provider configured. Add one on the AI tab." },
      { status: 503 },
    );
  }

  const last = messages[messages.length - 1];
  const userText = last?.role === "user" ? textOf(last) : "";
  const specialistKey = await routeToSpecialist(orgId, userText);
  const specialist = SPECIALISTS[specialistKey];

  const [model, label, modelMessages, answers, guide] = await Promise.all([
    resolveModelForOrg(orgId, specialist.model),
    modelLabelForOrg(orgId, specialist.model),
    convertToModelMessages(messages),
    getIntakeAnswers(ctx.project.id),
    getBrandGuide(ctx.brand.id),
  ]);

  const docText =
    typeof document === "string" && document.trim()
      ? document.trim().slice(0, 12000)
      : deliverable.content?.slice(0, 12000) || "(the document is empty)";

  const system =
    specialist.system({
      brandName: ctx.brand.name,
      projectName: ctx.project.name,
      brief: formatBriefForPrompt(answers),
      brandGuide: formatBrandGuideForPrompt(guide),
    }) +
    `\n\nThe user is editing a deliverable titled "${deliverable.title}" (${kindLabel(deliverable.kind)}). ` +
    `Help them with it directly: answer questions, draft or rewrite sections, tighten copy, and suggest improvements. ` +
    `When you produce content meant to go into the document, write it as clean Markdown that can be pasted straight in — no preamble like "here's a draft", just the content. ` +
    `\n\n# Current document\n${docText}`;

  const result = streamText({ model, system, messages: modelMessages });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) =>
      part.type === "start"
        ? { specialist: specialist.name, model: label }
        : undefined,
  });
}
