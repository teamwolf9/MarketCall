import { auth } from "@clerk/nextjs/server";
import { listActiveJobsForUser } from "@/server/jobs";

/** Currently-running agent work across the user's projects — polled by the widget. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const jobs = await listActiveJobsForUser(userId);
  return Response.json({ jobs });
}
