import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  deliverables,
  type Deliverable,
  type DeliverableKind,
} from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";
import { getProjectForUser, type ProjectContext } from "@/server/threads";

/**
 * Deliverables CRUD, always gated through the parent project's cascade check (a
 * deliverable has no ACL of its own). Reading needs any access to the project;
 * creating/editing/deleting needs editor+ — a deliverable is work product.
 */

async function canEdit(userId: string, projectId: string): Promise<boolean> {
  return roleAtLeast(await projectRole(userId, projectId), "editor");
}

/** Deliverables under a project, newest first — or null if the user can't reach it. */
export async function listDeliverables(
  userId: string,
  projectId: string,
): Promise<Deliverable[] | null> {
  if (!(await projectRole(userId, projectId))) return null;
  return db
    .select()
    .from(deliverables)
    .where(eq(deliverables.projectId, projectId))
    .orderBy(desc(deliverables.createdAt));
}

export type DeliverableContext = { deliverable: Deliverable; ctx: ProjectContext };

/** A deliverable plus its project/brand/role context, or null if unreachable. */
export async function getDeliverableForUser(
  userId: string,
  deliverableId: string,
): Promise<DeliverableContext | null> {
  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
  });
  if (!deliverable) return null;
  const ctx = await getProjectForUser(userId, deliverable.projectId);
  if (!ctx) return null;
  return { deliverable, ctx };
}

export type DeliverableInput = {
  projectId: string;
  title: string;
  kind?: DeliverableKind;
  content?: string;
};

/** Create a deliverable. Editor+ on the project. Returns the row, or null. */
export async function createDeliverable(
  userId: string,
  input: DeliverableInput,
): Promise<Deliverable | null> {
  if (!(await canEdit(userId, input.projectId))) return null;
  const [row] = await db
    .insert(deliverables)
    .values({
      projectId: input.projectId,
      title: input.title,
      kind: input.kind ?? "other",
      content: input.content ?? "",
      createdByUserId: userId,
    })
    .returning();
  return row;
}

/** Update a deliverable's title/kind/content. Editor+ on the project. */
export async function updateDeliverable(
  userId: string,
  deliverableId: string,
  patch: Partial<Pick<Deliverable, "title" | "kind" | "content">>,
): Promise<Deliverable | null> {
  const existing = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    columns: { id: true, projectId: true },
  });
  if (!existing) return null;
  if (!(await canEdit(userId, existing.projectId))) return null;
  const [row] = await db
    .update(deliverables)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      updatedAt: new Date(),
    })
    .where(eq(deliverables.id, deliverableId))
    .returning();
  return row;
}

/** Delete a deliverable. Editor+ on the project. */
export async function deleteDeliverable(
  userId: string,
  deliverableId: string,
): Promise<boolean> {
  const existing = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    columns: { id: true, projectId: true },
  });
  if (!existing) return false;
  if (!(await canEdit(userId, existing.projectId))) return false;
  await db.delete(deliverables).where(eq(deliverables.id, deliverableId));
  return true;
}
