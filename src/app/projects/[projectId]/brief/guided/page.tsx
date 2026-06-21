import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProjectForUser } from "@/server/threads";
import { getIntakeAnswers } from "@/server/intake/intake";
import { aiConfiguredForOrg } from "@/server/ai/providers";
import { roleAtLeast } from "@/server/auth/access";
import { GuidedBrief } from "./guided-brief";

export default async function GuidedBriefPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const ctx = await getProjectForUser(userId, projectId);
  if (!ctx) notFound();
  // Editing-only flow; send viewers to the read-only brief.
  if (!roleAtLeast(ctx.role, "editor")) {
    redirect(`/projects/${projectId}/brief`);
  }

  const [answers, assistEnabled] = await Promise.all([
    getIntakeAnswers(projectId),
    aiConfiguredForOrg(ctx.brand.orgId),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link
            href={`/projects/${projectId}/brief`}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            ← Back to brief
          </Link>
          <span className="text-sm text-muted">
            {ctx.brand.name} · {ctx.project.name}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <GuidedBrief
          projectId={projectId}
          initialAnswers={answers}
          assistEnabled={assistEnabled}
        />
      </main>
    </div>
  );
}
