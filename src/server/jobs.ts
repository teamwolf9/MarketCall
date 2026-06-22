import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs, type Job } from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";

/**
 * Durable jobs API. Two layers:
 *  - User-facing, access-checked: create a job (editor+), read/list (any access).
 *  - Internal progress mutators, called by the worker — no user, since the run
 *    happens detached from the request that started it.
 */

/** Create a campaign job (queued). Editor+ on the project. Returns it, or null. */
export async function createCampaignJob(
  userId: string,
  projectId: string,
  goal: string,
): Promise<Job | null> {
  if (!roleAtLeast(await projectRole(userId, projectId), "editor")) return null;
  const [row] = await db
    .insert(jobs)
    .values({ projectId, kind: "campaign", goal, createdByUserId: userId })
    .returning();
  return row;
}

/** A job, if the user can reach its project. */
export async function getJobForUser(
  userId: string,
  jobId: string,
): Promise<Job | null> {
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) return null;
  if (!(await projectRole(userId, job.projectId))) return null;
  return job;
}

/** Jobs under a project, newest first — or null if the user can't reach it. */
export async function listJobsForUser(
  userId: string,
  projectId: string,
): Promise<Job[] | null> {
  if (!(await projectRole(userId, projectId))) return null;
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.projectId, projectId))
    .orderBy(desc(jobs.createdAt));
}

// --- Internal progress mutators (worker-only) -------------------------------

/** Raw fetch by id with no access check — for the detached worker only. */
export async function loadJob(jobId: string): Promise<Job | null> {
  return (await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) })) ?? null;
}

export async function markRunning(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: "running", progress: 1, step: "Starting…", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function setProgress(
  jobId: string,
  progress: number,
  step: string,
): Promise<void> {
  await db
    .update(jobs)
    .set({ progress, step, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function completeJob(
  jobId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  await db
    .update(jobs)
    .set({
      status: "succeeded",
      progress: 100,
      step: "Done",
      result,
      updatedAt: now,
      finishedAt: now,
    })
    .where(eq(jobs.id, jobId));
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const now = new Date();
  await db
    .update(jobs)
    .set({ status: "failed", error, updatedAt: now, finishedAt: now })
    .where(eq(jobs.id, jobId));
}
