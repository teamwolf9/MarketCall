import { eq, inArray, asc } from "drizzle-orm";
import { db } from "@/server/db";
import { brands, projects, type Brand, type Project, type Role } from "@/server/db/schema";
import { reachableBrandIds, brandRole } from "@/server/auth/access";

/** Brands the user can reach (owned orgs + brand memberships), newest-named first. */
export async function listBrandsForUser(userId: string): Promise<Brand[]> {
  const ids = await reachableBrandIds(userId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(brands)
    .where(inArray(brands.id, ids))
    .orderBy(asc(brands.name));
}

/** A brand the user can reach, with their effective role — or null if no access. */
export async function getBrandForUser(
  userId: string,
  brandId: string,
): Promise<{ brand: Brand; role: Role } | null> {
  const role = await brandRole(userId, brandId);
  if (!role) return null;
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) return null;
  return { brand, role };
}

/**
 * Projects under a brand the user can reach. Access is checked at the brand
 * level first; if the user can reach the brand at all, brand access cascades to
 * every project inside it, so we return them all.
 */
export async function listProjectsForBrand(
  userId: string,
  brandId: string,
): Promise<Project[] | null> {
  const role = await brandRole(userId, brandId);
  if (!role) return null;
  return db
    .select()
    .from(projects)
    .where(eq(projects.brandId, brandId))
    .orderBy(asc(projects.name));
}
