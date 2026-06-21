import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  threads,
  messages,
  projects,
  brands,
  type Thread,
  type Message,
  type MessageRole,
  type Role,
} from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";

/**
 * Chat threads + messages, always reached through the parent project's cascade
 * access check (a thread has no ACL of its own). Reading needs any access to the
 * project; sending/creating needs editor+ — chatting produces draft deliverables,
 * which is work, not just viewing.
 */

export type ProjectContext = {
  project: typeof projects.$inferSelect;
  brand: typeof brands.$inferSelect;
  role: Role;
};

/** A project the user can reach, with its parent brand and the user's role — or null. */
export async function getProjectForUser(
  userId: string,
  projectId: string,
): Promise<ProjectContext | null> {
  const role = await projectRole(userId, projectId);
  if (!role) return null;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, project.brandId),
  });
  if (!brand) return null;
  return { project, brand, role };
}

/** Threads under a project, newest first — or null if the user can't reach it. */
export async function listThreads(
  userId: string,
  projectId: string,
): Promise<Thread[] | null> {
  const role = await projectRole(userId, projectId);
  if (!role) return null;
  return db
    .select()
    .from(threads)
    .where(eq(threads.projectId, projectId))
    .orderBy(asc(threads.createdAt));
}

export type ThreadContext = ProjectContext & { thread: Thread };

/** A thread plus its project/brand/role context, gated through the project cascade. */
export async function getThreadForUser(
  userId: string,
  threadId: string,
): Promise<ThreadContext | null> {
  const thread = await db.query.threads.findFirst({
    where: eq(threads.id, threadId),
  });
  if (!thread) return null;
  const ctx = await getProjectForUser(userId, thread.projectId);
  if (!ctx) return null;
  return { ...ctx, thread };
}

export async function listMessages(threadId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt));
}

/** Append a turn. Caller is responsible for the access check. */
export async function appendMessage(
  threadId: string,
  role: MessageRole,
  content: string,
  meta?: { model?: string; specialist?: string },
): Promise<void> {
  await db.insert(messages).values({
    threadId,
    role,
    content,
    model: meta?.model,
    specialist: meta?.specialist,
  });
}

/** Create a thread under a project. Editor+ required. Returns the new id, or null. */
export async function createThreadForUser(
  userId: string,
  projectId: string,
  title = "New chat",
): Promise<string | null> {
  const role = await projectRole(userId, projectId);
  if (!roleAtLeast(role, "editor")) return null;
  const [row] = await db
    .insert(threads)
    .values({ projectId, title })
    .returning({ id: threads.id });
  return row.id;
}

/** True when the user may post to this thread (editor+ on the parent project). */
export async function canPostToThread(
  userId: string,
  threadId: string,
): Promise<{ ok: boolean; ctx: ThreadContext | null }> {
  const ctx = await getThreadForUser(userId, threadId);
  if (!ctx) return { ok: false, ctx: null };
  return { ok: roleAtLeast(ctx.role, "editor"), ctx };
}

/** First user message becomes the thread title (once), so the sidebar reads well. */
export async function maybeTitleThread(
  threadId: string,
  firstUserText: string,
): Promise<void> {
  const existing = await db.query.threads.findFirst({
    where: eq(threads.id, threadId),
    columns: { title: true },
  });
  if (!existing || existing.title !== "New chat") return;
  const title = firstUserText.trim().slice(0, 60) || "New chat";
  await db
    .update(threads)
    .set({ title })
    .where(and(eq(threads.id, threadId), eq(threads.title, "New chat")));
}
