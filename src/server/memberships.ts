import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, type Membership } from "@/server/db/schema";

/**
 * Invites live in the same `memberships` table: a pending row carries the
 * invited `email` with a null `userId`. When that person signs in, we match
 * their verified email to any pending invites and bind them to the real Clerk
 * user id, flipping the row to `active`. The cascade access check reads active
 * rows only, so a pending invite grants nothing until this runs.
 */
export async function activatePendingInvites(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  await db
    .update(memberships)
    .set({ userId, status: "active" })
    .where(
      and(
        eq(memberships.email, normalized),
        eq(memberships.status, "pending"),
        isNull(memberships.userId),
      ),
    );
}

/** Every membership on a scope — active members and pending invites alike. */
export async function listScopeMembers(
  scopeType: "brand" | "project",
  scopeId: string,
): Promise<Membership[]> {
  return db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.scopeType, scopeType),
        eq(memberships.scopeId, scopeId),
      ),
    )
    .orderBy(asc(memberships.createdAt));
}
