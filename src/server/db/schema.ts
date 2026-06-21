import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

/**
 * MarketCall data model — the Org → Brand → Project hierarchy plus memberships.
 *
 * Identity (the human, their login) lives in Clerk. We only store the Clerk
 * user id (`text`) as a foreign reference. The authorization graph — who can
 * reach which brand/project — lives here, because Clerk's org primitive is
 * single-level and our hierarchy is two levels deep.
 */

export const roleEnum = pgEnum("role", [
  "owner",
  "admin",
  "editor",
  "viewer",
  "client",
]);

/** A membership grants a person a role at a single scope (a brand or a project). */
export const scopeTypeEnum = pgEnum("scope_type", ["brand", "project"]);

/** Invites start pending and activate when the invited email signs in. */
export const membershipStatusEnum = pgEnum("membership_status", [
  "pending",
  "active",
]);

/** The agency. Owned by a single Clerk user; the owner bypasses all scope checks. */
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("brands_org_slug_unique").on(t.orgId, t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("projects_brand_slug_unique").on(t.brandId, t.slug)],
);

/**
 * person × scope × role. `userId` is null for a pending invite (we only have
 * the email until they sign in); `email` is null once activated for a user who
 * was added directly. The cascade access check reads active rows only.
 */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: scopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    userId: text("user_id"),
    email: text("email"),
    role: roleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("memberships_user_idx").on(t.userId),
    index("memberships_scope_idx").on(t.scopeType, t.scopeId),
    index("memberships_email_idx").on(t.email),
  ],
);

export type Org = typeof orgs.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
