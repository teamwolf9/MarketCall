import "server-only";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  shareLinks,
  deliverables,
  projects,
  brands,
  type ShareLink,
  type DeliverableKind,
} from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";
import { getBrandGuide } from "@/server/brand-guide";
import { toExportTokens, type ExportTokens } from "@/lib/brand-guide";

/**
 * Public share links. Two audiences:
 *  - Editors manage links (create/list/revoke) — gated by editor+ on the
 *    deliverable's parent project, like every other write.
 *  - The public resolves a token with NO auth (resolvePublicDeliverable). That
 *    is the single deliberate hole in the cascade: an unguessable token grants
 *    view-only access to one deliverable, and only while the link is live.
 */

/** URL-safe, unguessable token (192 bits). */
function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Resolve the project for a deliverable IF the user may share it (editor+). */
async function projectIfCanShare(
  userId: string,
  deliverableId: string,
): Promise<string | null> {
  const d = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    columns: { id: true, projectId: true },
  });
  if (!d) return null;
  if (!roleAtLeast(await projectRole(userId, d.projectId), "editor")) return null;
  return d.projectId;
}

export async function createShareLink(
  userId: string,
  deliverableId: string,
): Promise<ShareLink | null> {
  if (!(await projectIfCanShare(userId, deliverableId))) return null;
  const [row] = await db
    .insert(shareLinks)
    .values({ deliverableId, token: newToken(), createdByUserId: userId })
    .returning();
  return row;
}

export async function listShareLinks(
  userId: string,
  deliverableId: string,
): Promise<ShareLink[] | null> {
  if (!(await projectIfCanShare(userId, deliverableId))) return null;
  return db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.deliverableId, deliverableId))
    .orderBy(desc(shareLinks.createdAt));
}

export async function revokeShareLink(
  userId: string,
  linkId: string,
): Promise<boolean> {
  const link = await db.query.shareLinks.findFirst({
    where: eq(shareLinks.id, linkId),
    columns: { id: true, deliverableId: true },
  });
  if (!link) return false;
  if (!(await projectIfCanShare(userId, link.deliverableId))) return false;
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(eq(shareLinks.id, linkId));
  return true;
}

/** True while a link grants access — not revoked and not past its expiry. */
export function isLinkLive(link: Pick<ShareLink, "revokedAt" | "expiresAt">): boolean {
  if (link.revokedAt) return false;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export type PublicDeliverable = {
  title: string;
  content: string;
  kind: DeliverableKind;
  brandName: string;
  tokens?: ExportTokens;
};

/**
 * PUBLIC — no auth. Resolve a share token to a view-only deliverable, honoring
 * revoke + expiry. Returns null for any miss so the page renders a plain 404
 * (never leak whether a token ever existed).
 */
export async function resolvePublicDeliverable(
  token: string,
): Promise<PublicDeliverable | null> {
  if (!token) return null;
  const link = await db.query.shareLinks.findFirst({
    where: eq(shareLinks.token, token),
  });
  if (!link || !isLinkLive(link)) return null;

  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, link.deliverableId),
  });
  if (!deliverable) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, deliverable.projectId),
    columns: { brandId: true },
  });
  const brand = project
    ? await db.query.brands.findFirst({
        where: eq(brands.id, project.brandId),
        columns: { id: true, name: true, logoUrl: true },
      })
    : null;

  return {
    title: deliverable.title,
    content: deliverable.content,
    kind: deliverable.kind,
    brandName: brand?.name ?? "",
    tokens: brand
      ? toExportTokens(await getBrandGuide(brand.id), brand.name, brand.logoUrl)
      : undefined,
  };
}
