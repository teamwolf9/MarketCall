import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProjectForUser } from "@/server/threads";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { visibleSections } from "@/server/intake/questions";
import { saveIntake } from "@/server/intake/actions";
import { roleAtLeast } from "@/server/auth/access";
import { ProjectHeader } from "../project-header";

export default async function BriefPage({
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

  const answers = await getIntakeAnswers(projectId);
  const stats = intakeStats(answers);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="brief"
        briefPct={stats.pct}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="rise mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Marketing brief
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          The research foundation for this project. Everything the assistant
          builds — strategy, copy, calendars — draws on these answers. Fill in
          what you know; you can always come back.
        </p>

        {/* Guided walkthrough CTA */}
        {canEdit && (
          <Link
            href={`/projects/${project.id}/brief/guided`}
            className="group mt-6 flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft/50 p-5 transition-colors hover:bg-accent-soft"
          >
            <div>
              <div className="font-display text-lg font-semibold text-ink">
                ✨ Not sure where to start? Let me walk you through it.
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                One question at a time, in plain English — and I&apos;ll draft
                answers for you. No marketing experience needed.
              </p>
            </div>
            <span className="btn btn-primary whitespace-nowrap">
              Walk me through it
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        )}

        {/* Completion meter */}
        <div className="mt-6 card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">
              {stats.answered} of {stats.total} answered
            </span>
            <span className="font-medium text-ink">{stats.pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
        </div>

        <form action={saveIntake} className="mt-8 space-y-8">
          <input type="hidden" name="projectId" value={project.id} />

          {visibleSections(answers).map((section) => (
            <section key={section.id} className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink">
                {section.title}
              </h2>
              {section.intro && (
                <p className="mt-1 text-sm text-ink-soft">{section.intro}</p>
              )}

              <div className="mt-5 space-y-5">
                {section.fields.map((f) => {
                  const value = answers[f.id] ?? "";
                  return (
                    <label key={f.id} className="block space-y-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {f.label}
                        {f.required && (
                          <span className="text-accent" title="Recommended">
                            *
                          </span>
                        )}
                      </span>
                      {f.help && (
                        <span className="block text-xs text-muted">{f.help}</span>
                      )}
                      {f.type === "textarea" ? (
                        <textarea
                          name={f.id}
                          rows={3}
                          defaultValue={value}
                          disabled={!canEdit}
                          placeholder={f.placeholder}
                          className="input resize-y disabled:opacity-60"
                        />
                      ) : f.type === "select" ? (
                        <select
                          name={f.id}
                          defaultValue={value}
                          disabled={!canEdit}
                          className="input disabled:opacity-60"
                        >
                          <option value="">—</option>
                          {f.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={f.id}
                          type="text"
                          defaultValue={value}
                          disabled={!canEdit}
                          placeholder={f.placeholder}
                          className="input disabled:opacity-60"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {canEdit ? (
            <div className="sticky bottom-4 flex justify-end">
              <button
                type="submit"
                className="btn btn-primary shadow-md"
              >
                Save brief
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              You have view-only access to this brief.
            </p>
          )}
        </form>
        </main>
      </div>
    </div>
  );
}
