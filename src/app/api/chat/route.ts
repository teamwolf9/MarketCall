import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  aiConfiguredForOrg,
  modelLabelForOrg,
  resolveModelForOrg,
} from "@/server/ai/providers";
import { routeToSpecialist } from "@/server/ai/orchestrator";
import { SPECIALISTS } from "@/server/ai/specialists";
import { getIntakeAnswers, formatBriefForPrompt } from "@/server/intake/intake";
import {
  appendMessage,
  canPostToThread,
  maybeTitleThread,
} from "@/server/threads";

export const maxDuration = 30;

/** Flatten a UI message's text parts into a plain string for persistence. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages, threadId } = (await req.json()) as {
    messages: UIMessage[];
    threadId?: string;
  };
  if (!threadId) return new Response("Missing threadId", { status: 400 });

  // Cascade access: editor+ on the thread's parent project may post.
  const { ok, ctx } = await canPostToThread(userId, threadId);
  if (!ctx) return new Response("Not found", { status: 404 });
  if (!ok) return new Response("Forbidden", { status: 403 });

  // The model is the active provider of the project's parent org (env fallback).
  const orgId = ctx.brand.orgId;
  if (!(await aiConfiguredForOrg(orgId))) {
    return Response.json(
      {
        error:
          "No AI provider configured. Add one on the AI tab, or set AI_* vars in .env.local.",
      },
      { status: 503 },
    );
  }

  // Persist the user's new turn (the last message in the array).
  const last = messages[messages.length - 1];
  const userText = last?.role === "user" ? textOf(last) : "";
  if (userText) {
    await appendMessage(threadId, "user", userText);
    await maybeTitleThread(threadId, userText);
  }

  // Orchestrator: route to a specialist, then run it with its preferred model,
  // grounded in the project's marketing brief.
  const specialistKey = await routeToSpecialist(orgId, userText);
  const specialist = SPECIALISTS[specialistKey];

  const [model, label, modelMessages, answers] = await Promise.all([
    resolveModelForOrg(orgId, specialist.model),
    modelLabelForOrg(orgId, specialist.model),
    convertToModelMessages(messages),
    getIntakeAnswers(ctx.project.id),
  ]);

  const result = streamText({
    model,
    system: specialist.system({
      brandName: ctx.brand.name,
      projectName: ctx.project.name,
      brief: formatBriefForPrompt(answers),
    }),
    messages: modelMessages,
    onFinish: async ({ text }) => {
      const clean = text.trim();
      if (clean) {
        await appendMessage(threadId, "assistant", clean, {
          model: label,
          specialist: specialistKey,
        });
      }
    },
  });

  return result.toUIMessageStreamResponse({
    // Surface who answered + on what model, live, so the UI can label the turn.
    messageMetadata: ({ part }) =>
      part.type === "start"
        ? { specialist: specialist.name, model: label }
        : undefined,
  });
}
