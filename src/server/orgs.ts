import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orgs } from "@/server/db/schema";

/**
 * Every signed-in user owns exactly one org (their agency). We bootstrap it
 * lazily on first need so there's no separate onboarding step yet. The owner
 * bypasses all scope checks (see `src/server/auth/access.ts`).
 */
export async function ensureOrgForUser(
  userId: string,
  name = "My Agency",
): Promise<string> {
  const existing = await db.query.orgs.findFirst({
    where: eq(orgs.ownerUserId, userId),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const [row] = await db
    .insert(orgs)
    .values({ name, ownerUserId: userId })
    .returning({ id: orgs.id });
  return row.id;
}
