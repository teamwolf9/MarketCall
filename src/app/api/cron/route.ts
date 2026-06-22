import { runDueAutomations } from "@/server/automations";

/**
 * Scheduler entrypoint for autonomous automations. Point any cron at it — Vercel
 * Cron, cron-job.org, a scheduled Claude Code routine, etc. Gated by a shared
 * secret so it isn't publicly triggerable. This route is public in middleware
 * (no Clerk session); the secret is the auth.
 *
 *   CRON_SECRET   required; send it as `Authorization: Bearer <secret>`
 *                 or `?secret=<secret>`.
 */
export const maxDuration = 300;

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not set" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ran = await runDueAutomations();
  return Response.json({ ok: true, ran });
}

export async function POST(req: Request) {
  return handle(req);
}

// GET too, so simple cron services that only do GET can trigger it.
export async function GET(req: Request) {
  return handle(req);
}
