"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { brands, projects } from "@/server/db/schema";
import { ensureOrgForUser } from "@/server/orgs";
import { brandRole, roleAtLeast } from "@/server/auth/access";
import { slugify } from "@/lib/slug";

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
