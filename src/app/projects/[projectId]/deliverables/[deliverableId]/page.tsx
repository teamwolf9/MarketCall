import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDeliverableForUser } from "@/server/deliverables";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { saveDeliverable, removeDeliverable } from "@/server/actions";
import { DELIVERABLE_KINDS, kindLabel } from "@/lib/deliverables";
import { ProjectHeader } from "../../project-header";

export default async function DeliverablePage({
  params,
}: {
  params: Promise<{ projectId: string; deliverableId: string }>;
}) {
  const { projectId, deliverableId } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const found = await getDeliverableForUser(userId, deliverableId);
  if (!found || found.deliverable.projectId !== projectId) notFound();
  const { deliverable, ctx } = found;
  const { project, brand, role } = ctx;
  const canEdit = roleAtLeast(role, "editor");
  const briefPct = intakeStats(await getIntakeAnswers(projectId)).pct;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="deliverables"
        briefPct={briefPct}
      />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link
          href={`/projects/${project.id}/deliverables`}
          className="text-sm text-ink-soft transition hover:text-ink"
        >
          ← Deliverables
        </Link>

        {canEdit ? (
          <form action={saveDeliverable} className="mt-4 space-y-4">
            <input type="hidden" name="deliverableId" value={deliverable.id} />
            <input type="hidden" name="projectId" value={project.id} />

            <div className="flex items-center gap-3">
              <input
                name="title"
                defaultValue={deliverable.title}
                required
                placeholder="Deliverable title…"
                className="input flex-1 font-display text-lg"
              />
              <select
                name="kind"
                defaultValue={deliverable.kind}
                className="input w-40 shrink-0"
              >
                {DELIVERABLE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              name="content"
              defaultValue={deliverable.content}
              rows={22}
              placeholder="Write the deliverable in markdown…"
              className="input min-h-[24rem] w-full resize-y font-mono text-sm leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        ) : (
          <article className="mt-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {deliverable.title}
              </h1>
              <span className="badge">{kindLabel(deliverable.kind)}</span>
            </div>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {deliverable.content || (
                <span className="text-muted">This deliverable is empty.</span>
              )}
            </div>
          </article>
        )}

        {canEdit && (
          <form action={removeDeliverable} className="mt-8 border-t border-line pt-4">
            <input type="hidden" name="deliverableId" value={deliverable.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <button
              type="submit"
              className="text-sm text-muted transition hover:text-danger"
            >
              Delete deliverable
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
