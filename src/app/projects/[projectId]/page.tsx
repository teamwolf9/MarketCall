import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import { getProjectForUser, listThreads, listMessages } from "@/server/threads";
import { aiConfiguredForOrg } from "@/server/ai/providers";
import { specialistName } from "@/server/ai/specialists";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { createChatThread, deleteChatThread } from "@/server/actions";
import { Chat } from "./chat";
import { ProjectHeader } from "./project-header";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { projectId } = await params;
  const { thread: threadParam } = await searchParams;
  const { userId } = await auth();
  if (!userId) notFound();

  const ctx = await getProjectForUser(userId, projectId);
  if (!ctx) notFound();
  const { project, brand, role } = ctx;
  const canPost = roleAtLeast(role, "editor");

  const threads = (await listThreads(userId, projectId)) ?? [];
  const activeId =
    (threadParam && threads.find((t) => t.id === threadParam)?.id) ??
    threads[0]?.id ??
    null;

  const initialMessages: UIMessage[] = activeId
    ? (await listMessages(activeId)).map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
        ...(m.role === "assistant"
          ? {
              metadata: {
                specialist: specialistName(m.specialist),
                model: m.model ?? undefined,
              },
            }
          : {}),
      }))
    : [];

  const configured = await aiConfiguredForOrg(brand.orgId);
  const briefPct = intakeStats(await getIntakeAnswers(projectId)).pct;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="chat"
        briefPct={briefPct}
      />

      <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 gap-6 px-6 py-6">
        {/* Thread sidebar */}
        <aside className="flex w-60 shrink-0 flex-col min-h-0">
          {canPost && (
            <form action={createChatThread}>
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit" className="btn btn-primary mb-4 w-full">
                + New chat
              </button>
            </form>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="px-1 text-sm text-muted">No chats yet.</p>
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id} className="group flex items-center gap-1">
                  <Link
                    href={`/projects/${project.id}?thread=${t.id}`}
                    className={`flex-1 truncate rounded-lg px-3 py-2 text-sm transition-colors ${
                      t.id === activeId
                        ? "bg-accent-soft font-medium text-accent-hover"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                    }`}
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                  {canPost && (
                    <form action={deleteChatThread}>
                      <input type="hidden" name="threadId" value={t.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <button
                        type="submit"
                        className="px-1 text-xs text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                        title="Delete chat"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          </div>
        </aside>

        {/* Chat panel */}
        <main className="card flex min-h-0 flex-1 flex-col overflow-hidden">
          {!configured && (
            <div className="border-b border-line bg-accent-soft/60 px-5 py-2.5 text-sm text-accent-hover">
              No AI provider configured yet. Add one on the{" "}
              <Link href="/ai" className="underline underline-offset-2">
                AI tab
              </Link>{" "}
              to start chatting.
            </div>
          )}
          {configured && briefPct === 0 && (
            <div className="border-b border-line bg-surface-2 px-5 py-2.5 text-sm text-ink-soft">
              Tip: fill out the{" "}
              <Link
                href={`/projects/${project.id}/brief`}
                className="font-medium text-accent underline underline-offset-2"
              >
                project brief
              </Link>{" "}
              so the assistant works from your brand, audience, and goals.
            </div>
          )}
          {activeId ? (
            <div className="flex min-h-0 flex-1 flex-col px-5">
              <Chat
                key={activeId}
                threadId={activeId}
                initialMessages={initialMessages}
                canPost={canPost && configured}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted">
              {canPost
                ? "Start a new chat to talk to MarketCall about this project."
                : "No chats yet."}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
