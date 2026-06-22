import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProjectForUser } from "@/server/threads";
import { listJobsForUser } from "@/server/jobs";
import { aiConfiguredForOrg } from "@/server/ai/providers";
import { getIntakeAnswers, intakeStats } from "@/server/intake/intake";
import { roleAtLeast } from "@/server/auth/access";
import { ProjectHeader } from "../project-header";
import { CampaignLauncher } from "./campaign-launcher";

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-surface-2 text-ink-soft",
  running: "bg-accent-soft text-accent-hover",
  succeeded: "bg-accent-soft text-accent-hover",
  failed: "border border-danger/30 bg-danger-soft text-danger",
};

export default async function JobsPage({
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
  const canRun = roleAtLeast(role, "editor");

  const jobs = (await listJobsForUser(userId, projectId)) ?? [];
  const briefPct = intakeStats(await getIntakeAnswers(projectId)).pct;
  const configured = await aiConfiguredForOrg(brand.orgId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectHeader
        brand={brand}
        project={project}
        role={role}
        active="jobs"
        briefPct={briefPct}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Long agent runs that work in the background and produce real artifacts.
        </p>

        <div className="mt-6">
          {configured ? (
            <CampaignLauncher projectId={project.id} canRun={canRun} />
          ) : (
            <div className="card p-5 text-sm text-ink-soft">
              No AI provider configured.{" "}
              <Link href="/ai" className="underline underline-offset-2">
                Add one
              </Link>{" "}
              to run campaign generation.
            </div>
          )}
        </div>

        <h2 className="label mt-10">History</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No jobs yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-ink">
                    {j.goal || "Campaign"}
                  </span>
                  <span
                    className={`badge shrink-0 ${STATUS_STYLE[j.status] ?? ""}`}
                  >
                    {j.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {j.status === "running" || j.status === "queued"
                    ? `${j.step ?? "Working"} · ${j.progress}%`
                    : j.status === "failed"
                      ? j.error
                      : (j.result?.summary as string | undefined) ??
                        "Completed"}
                  {" · "}
                  {j.createdAt.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  );
}
