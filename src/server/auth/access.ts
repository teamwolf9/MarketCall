import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orgs, brands, projects, memberships, type Role } from "@/server/db/schema";

/**
 * The cascade access rule (the load-bearing authorization decision):
 *
 *   can a user reach a project?  ⇢  org owner?
 *                                   OR member of the project's parent brand?
 *                                   OR member of the project itself?
 *
 * Brand access flows DOWN to every project inside it. Project access stays
 * narrow and never leaks to sibling projects. Org ownership bypasses everything.
 *
 * These are the server-side gate. The UI mirrors them, but never trust the UI —
 * every data path that touches a scoped resource must call through here.
 */

/** Highest-privilege role wins when a user has access via multiple paths. */
const ROLE_RANK: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  viewer: 2,
  client: 1,
};

export function higherRole(a: Role, b: Role): Role {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

async function activeMembership(
  userId: string,
  scopeType: "brand" | "project",
  scopeId: string,
): Promise<Role | null> {
  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        eq(memberships.scopeType, scopeType),
        eq(memberships.scopeId, scopeId),
      ),
    );
  if (rows.length === 0) return null;
  return rows.map((r) => r.role).reduce(higherRole);
}

/** Resolve a user's effective role on a brand, or null if no access. */
export async function brandRole(
  userId: string,
  brandId: string,
): Promise<Role | null> {
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, brandId),
    columns: { id: true, orgId: true },
  });
  if (!brand) return null;

  if (await isOrgOwner(userId, brand.orgId)) return "owner";
  return activeMembership(userId, "brand", brandId);
}

/**
 * Resolve a user's effective role on a project via the cascade, or null.
 * Brand-level access is inherited; the higher of (brand role, project role) wins.
 */
export async function projectRole(
  userId: string,
  projectId: string,
): Promise<Role | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { id: true, brandId: true },
  });
  if (!project) return null;

  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, project.brandId),
    columns: { id: true, orgId: true },
  });
  if (!brand) return null;

  if (await isOrgOwner(userId, brand.orgId)) return "owner";

  const fromBrand = await activeMembership(userId, "brand", brand.id);
  const fromProject = await activeMembership(userId, "project", projectId);

  if (fromBrand && fromProject) return higherRole(fromBrand, fromProject);
  return fromBrand ?? fromProject;
}

export async function isOrgOwner(userId: string, orgId: string): Promise<boolean> {
  const org = await db.query.orgs.findFirst({
    where: and(eq(orgs.id, orgId), eq(orgs.ownerUserId, userId)),
    columns: { id: true },
  });
  return !!org;
}

export async function canAccessBrand(userId: string, brandId: string) {
  return (await brandRole(userId, brandId)) !== null;
}

export async function canAccessProject(userId: string, projectId: string) {
  return (await projectRole(userId, projectId)) !== null;
}

/**
 * Every brand a user can reach: the orgs they own (all brands inside) plus any
 * brand they're a direct member of. Used to scope list views — the row-level
 * filter the brief calls for, enforced in the app layer.
 */
export async function reachableBrandIds(userId: string): Promise<string[]> {
  const ownedOrgs = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.ownerUserId, userId));

  const ownedBrands = ownedOrgs.length
    ? await db
        .select({ id: brands.id })
        .from(brands)
        .where(
          inArray(
            brands.orgId,
            ownedOrgs.map((o) => o.id),
          ),
        )
    : [];

  const memberBrands = await db
    .select({ scopeId: memberships.scopeId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        eq(memberships.scopeType, "brand"),
      ),
    );

  return [
    ...new Set([
      ...ownedBrands.map((b) => b.id),
      ...memberBrands.map((m) => m.scopeId),
    ]),
  ];
}
