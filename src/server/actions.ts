"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  brands,
  projects,
  memberships,
  threads,
  type Role,
  type DeliverableKind,
} from "@/server/db/schema";
import { ensureOrgForUser } from "@/server/orgs";
import { brandRole, roleAtLeast, projectRole } from "@/server/auth/access";
import { createThreadForUser } from "@/server/threads";
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
} from "@/server/deliverables";
import { createShareLink, revokeShareLink } from "@/server/sharing";
import { reindexProjectMemories } from "@/server/memory";
import { DELIVERABLE_KINDS as DELIVERABLE_KIND_OPTIONS } from "@/lib/deliverables";
import { slugify } from "@/lib/slug";

const DELIVERABLE_KIND_VALUES = DELIVERABLE_KIND_OPTIONS.map((k) => k.value);

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

/** Create a brand under the caller's org. Owner/admin only (org owner here). */
export async function createBrand(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const orgId = await ensureOrgForUser(userId);
  await db.insert(brands).values({ orgId, name, slug: slugify(name) });

  revalidatePath("/");
}

/** Delete a brand (and its projects, via FK cascade). Admin+ on the brand. */
export async function deleteBrand(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const brandId = String(formData.get("brandId") ?? "");
  if (!brandId) return;

  const role = await brandRole(userId, brandId);
  if (!roleAtLeast(role, "admin")) return; // silent no-op for the under-privileged

  await db.delete(brands).where(eq(brands.id, brandId));
  revalidatePath("/");
}

/** Create a project under a brand. Editor+ on the brand (inherited or direct). */
export async function createProject(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const brandId = String(formData.get("brandId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!brandId || !name) return;

  const role = await brandRole(userId, brandId);
  if (!roleAtLeast(role, "editor")) return;

  await db.insert(projects).values({ brandId, name, slug: slugify(name) });
  revalidatePath(`/brands/${brandId}`);
}

/** Delete a project. Admin+ on the parent brand. */
export async function deleteProject(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  if (!projectId || !brandId) return;

  const role = await brandRole(userId, brandId);
  if (!roleAtLeast(role, "admin")) return;

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.brandId, brandId)));
  revalidatePath(`/brands/${brandId}`);
}

/** Roles an org owner/admin may hand out via an invite. `owner` is org-only. */
const INVITABLE_ROLES: Role[] = ["admin", "editor", "viewer", "client"];

/**
 * Invite someone to a brand by email. Admin+ on the brand. Creates a pending
 * membership keyed on the (lowercased) email; it activates when they sign in
 * (see `activatePendingInvites`). Re-inviting an existing member is a no-op.
 */
export async function inviteMember(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const brandId = String(formData.get("brandId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;
  if (!brandId || !email || !email.includes("@")) return;
  if (!INVITABLE_ROLES.includes(role)) return;

  const callerRole = await brandRole(userId, brandId);
  if (!roleAtLeast(callerRole, "admin")) return;

  // Don't stack a duplicate row for the same person on the same brand.
  const existing = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.scopeType, "brand"),
      eq(memberships.scopeId, brandId),
      eq(memberships.email, email),
    ),
    columns: { id: true },
  });
  if (existing) return;

  await db.insert(memberships).values({
    scopeType: "brand",
    scopeId: brandId,
    email,
    role,
    status: "pending",
  });
  revalidatePath(`/brands/${brandId}`);
}

/** Remove a member or revoke a pending invite. Admin+ on the brand. */
export async function removeMember(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const membershipId = String(formData.get("membershipId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  if (!membershipId || !brandId) return;

  const callerRole = await brandRole(userId, brandId);
  if (!roleAtLeast(callerRole, "admin")) return;

  await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.scopeType, "brand"),
        eq(memberships.scopeId, brandId),
      ),
    );
  revalidatePath(`/brands/${brandId}`);
}

/** Start a new chat thread in a project, then open it. Editor+ on the project. */
export async function createChatThread(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const threadId = await createThreadForUser(userId, projectId);
  if (!threadId) return; // under-privileged or missing project — silent no-op
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?thread=${threadId}`);
}

/** Delete a chat thread (and its messages, via FK cascade). Editor+ on the project. */
export async function deleteChatThread(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const threadId = String(formData.get("threadId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!threadId || !projectId) return;

  const role = await projectRole(userId, projectId);
  if (!roleAtLeast(role, "editor")) return;

  await db
    .delete(threads)
    .where(and(eq(threads.id, threadId), eq(threads.projectId, projectId)));
  revalidatePath(`/projects/${projectId}`);
}

/** Create a blank deliverable and open it for editing. Editor+ on the project. */
export async function createBlankDeliverable(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const row = await createDeliverable(userId, {
    projectId,
    title: "Untitled deliverable",
    kind: "other",
  });
  if (!row) return; // under-privileged or missing project — silent no-op
  revalidatePath(`/projects/${projectId}/deliverables`);
  redirect(`/projects/${projectId}/deliverables/${row.id}`);
}

/** Save edits to a deliverable's title/kind/content. Editor+ on the project. */
export async function saveDeliverable(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!deliverableId || !projectId || !title) return;

  const kind = DELIVERABLE_KIND_VALUES.includes(kindRaw as DeliverableKind)
    ? (kindRaw as DeliverableKind)
    : undefined;

  await updateDeliverable(userId, deliverableId, { title, kind, content });
  revalidatePath(`/projects/${projectId}/deliverables/${deliverableId}`);
  revalidatePath(`/projects/${projectId}/deliverables`);
}

/** Delete a deliverable, then return to the list. Editor+ on the project. */
export async function removeDeliverable(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!deliverableId || !projectId) return;

  await deleteDeliverable(userId, deliverableId);
  revalidatePath(`/projects/${projectId}/deliverables`);
  redirect(`/projects/${projectId}/deliverables`);
}

/** Mint a public share link for a deliverable. Editor+ on the project. */
export async function createShareLinkAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!deliverableId || !projectId) return;

  await createShareLink(userId, deliverableId);
  revalidatePath(`/projects/${projectId}/deliverables/${deliverableId}`);
}

/** Revoke a public share link (it stops resolving immediately). Editor+. */
export async function revokeShareLinkAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const linkId = String(formData.get("linkId") ?? "");
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!linkId || !deliverableId || !projectId) return;

  await revokeShareLink(userId, linkId);
  revalidatePath(`/projects/${projectId}/deliverables/${deliverableId}`);
}

/** Re-embed all of a project's deliverables into brand memory. Editor+. */
export async function reindexMemory(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  await reindexProjectMemories(userId, projectId);
  revalidatePath(`/projects/${projectId}/deliverables`);
}
