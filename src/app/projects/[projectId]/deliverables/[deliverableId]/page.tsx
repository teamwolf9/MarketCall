import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDeliverableForUser } from "@/server/deliverables";
import { listShareLinks, isLinkLive } from "@/server/sharing";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { removeDeliverable } from "@/server/actions";
import { kindLabel } from "@/lib/deliverables";
import { ProjectHeader } from "../../project-header";
import { SharePanel } from "./share-panel";
import { ShareActions } from "@/app/_components/share-actions";
import { Markdown } from "@/app/_components/markdown";
import { DeliverableEditor } from "./deliverable-editor";

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

  // Editors manage public links; show only the live ones (revoked/expired hidden).
  const liveLinks = canEdit
    ? ((await listShareLinks(userId, deliverable.id)) ?? [])
        .filter(isLinkLive)
        .map((l) => ({ id: l.id, token: l.token }))
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="deliverables"
        briefPct={briefPct}
      />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/projects/${project.id}/deliverables`}
            className="text-sm text-ink-soft transition hover:text-ink"
          >
            ← Deliverables
          </Link>
          <ShareActions title={deliverable.title} content={deliverable.content} />
        </div>

        <div className="mt-4">
          {canEdit ? (
            <DeliverableEditor
              deliverableId={deliverable.id}
              projectId={project.id}
              initialTitle={deliverable.title}
              initialKind={deliverable.kind}
              initialContent={deliverable.content}
            />
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {deliverable.title}
                </h1>
                <span className="badge">{kindLabel(deliverable.kind)}</span>
              </div>
              <div className="card mt-5 p-7 sm:p-9">
                {deliverable.content ? (
                  <Markdown>{deliverable.content}</Markdown>
                ) : (
                  <p className="text-sm text-muted">This deliverable is empty.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <SharePanel
            deliverableId={deliverable.id}
            projectId={project.id}
            links={liveLinks}
          />
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
