import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProjectForUser } from "@/server/threads";
import { listDeliverables } from "@/server/deliverables";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { createBlankDeliverable, reindexMemory } from "@/server/actions";
import { embeddingsConfigured } from "@/server/ai/embeddings";
import { kindLabel } from "@/lib/deliverables";
import { ProjectHeader } from "../project-header";

export default async function DeliverablesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const ctx = await getProjectForUser(userId, projectId);
  if (!ctx) notFound();
  const { project, brand, role } = ctx;
  const canEdit = roleAtLeast(role, "editor");

  const deliverables = (await listDeliverables(userId, projectId)) ?? [];
  const briefPct = intakeStats(await getIntakeAnswers(projectId)).pct;
  const memoryOn = embeddingsConfigured();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="deliverables"
        briefPct={briefPct}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Deliverables
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Saved work for this project — plans, ad copy, calendars, and briefs.
              The chat saves these for you, or start one by hand.
            </p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-2">
              {memoryOn && deliverables.length > 0 && (
                <form action={reindexMemory}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button
                    type="submit"
                    className="btn btn-outline"
                    title="Re-embed these deliverables into brand memory so the chat can recall them"
                  >
                    Reindex memory
                  </button>
                </form>
              )}
              <form action={createBlankDeliverable}>
                <input type="hidden" name="projectId" value={project.id} />
                <button type="submit" className="btn btn-primary">
                  + New
                </button>
              </form>
            </div>
          )}
        </div>

        {deliverables.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-line py-16 text-center text-sm text-muted">
            Nothing here yet. Ask the chat to plan a campaign or write ad copy, then
            tell it to save the result — it&apos;ll show up here.
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {deliverables.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/projects/${project.id}/deliverables/${d.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3 transition hover:border-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {d.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Updated{" "}
                      {d.updatedAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="badge shrink-0">{kindLabel(d.kind)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  );
}
