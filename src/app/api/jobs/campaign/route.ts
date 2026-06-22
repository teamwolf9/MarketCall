import { auth } from "@clerk/nextjs/server";
import { createCampaignJob } from "@/server/jobs";
import { runCampaignJob } from "@/server/ai/campaign";
import { aiConfiguredForOrg } from "@/server/ai/providers";
import { getProjectForUser } from "@/server/threads";

// Long agent run — allow plenty of headroom on platforms that honor it.
export const maxDuration = 300;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { projectId, goal } = (await req.json()) as {
    projectId?: string;
    goal?: string;
  };
  if (!projectId || typeof goal !== "string" || !goal.trim()) {
    return new Response("Missing projectId or goal", { status: 400 });
  }

  const ctx = await getProjectForUser(userId, projectId);
  if (!ctx) return new Response("Not found", { status: 404 });
  if (!(await aiConfiguredForOrg(ctx.brand.orgId))) {
    return Response.json(
      { error: "No AI provider configured." },
      { status: 503 },
    );
  }

  const job = await createCampaignJob(userId, projectId, goal.trim());
  if (!job) return new Response("Forbidden", { status: 403 });

  // Fire-and-forget: the run continues in-process after we respond (the Node
  // server stays alive). State is durable in the jobs row, so the UI polls and
  // the run survives client navigation. Swap this for Inngest/Trigger.dev to
  // make it survive a serverless instance recycling too.
  void runCampaignJob(job.id);

  return Response.json({ jobId: job.id });
}
