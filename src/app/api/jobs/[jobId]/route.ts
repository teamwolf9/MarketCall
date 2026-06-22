import { auth } from "@clerk/nextjs/server";
import { getJobForUser } from "@/server/jobs";

/** Poll target for a running job — access-checked through the project cascade. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { jobId } = await params;
  const job = await getJobForUser(userId, jobId);
  if (!job) return new Response("Not found", { status: 404 });

  return Response.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    step: job.step,
    result: job.result,
    error: job.error,
  });
}
