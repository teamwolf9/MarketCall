import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  unique,
  index,
  boolean,
  jsonb,
  integer,
  vector,
} from "drizzle-orm/pg-core";
import type { BrandGuideData } from "@/lib/brand-guide";

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
    // Brand logo as a small downscaled data URL (no external storage needed;
    // swap for an R2 object URL later). Null when unset.
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("brands_org_slug_unique").on(t.orgId, t.slug)],
);

/**
 * The brand design system — one per brand. Holds the design tokens (colors,
 * typography, voice, imagery) that drive on-brand asset exports and AI
 * generation. Stored as a JSON blob (merged over defaults on read).
 */
export const brandGuides = pgTable("brand_guides", {
  brandId: uuid("brand_id")
    .primaryKey()
    .references(() => brands.id, { onDelete: "cascade" }),
  guide: jsonb("guide").$type<Partial<BrandGuideData>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Uploaded brand assets — full logos (horizontal/vertical/reversed), font files,
 * and brand documents. Bytes are stored base64 in `data` and served through an
 * access-controlled route (no external storage yet). `variant` names a logo slot
 * (one per brand+variant); it's null for fonts/documents (many allowed).
 */
export const brandAssetKindEnum = pgEnum("brand_asset_kind", [
  "logo",
  "font",
  "document",
  "image",
]);

export const brandAssets = pgTable(
  "brand_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    kind: brandAssetKindEnum("kind").notNull(),
    variant: text("variant"),
    label: text("label").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: text("data").notNull(),
    meta: jsonb("meta").$type<{ fontFamily?: string; format?: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("brand_assets_brand_idx").on(t.brandId)],
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

/**
 * Chat lives under a project (Org → Brand → Project → threads). A thread is one
 * conversation with the orchestrator; messages are its turns. Reachability is
 * always resolved through the parent project's cascade access check — a thread
 * has no independent ACL.
 */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("threads_project_idx").on(t.projectId)],
);

/** Who authored a turn. `system` prompts are not persisted — they're applied at request time. */
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    // Which model produced an assistant turn (null for user turns). Lets us show
    // and later route by model — the multi-provider story.
    model: text("model"),
    // Which specialist agent handled an assistant turn (null for user turns).
    specialist: text("specialist"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId, t.createdAt)],
);

/**
 * AI provider profiles, owned by an org (the agency brings its own keys). The
 * API key is stored encrypted at rest (AES-256-GCM) — never in plaintext, never
 * sent to the browser. Exactly one profile per org is active; the chat resolves
 * the model from the active profile of the project's parent org, falling back to
 * the .env provider when an org has none.
 */
export const aiProviderTypeEnum = pgEnum("ai_provider_type", [
  "openai-compatible",
  "anthropic",
]);

export const aiProviders = pgTable(
  "ai_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    providerType: aiProviderTypeEnum("provider_type").notNull(),
    baseUrl: text("base_url"),
    model: text("model").notNull(),
    modelFast: text("model_fast"),
    modelSmart: text("model_smart"),
    // AES-256-GCM ciphertext (iv:tag:data, base64) — see src/server/crypto.ts.
    apiKeyCipher: text("api_key_cipher").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ai_providers_org_idx").on(t.orgId)],
);

export type Org = typeof orgs.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type BrandGuideRow = typeof brandGuides.$inferSelect;
export type BrandAsset = typeof brandAssets.$inferSelect;
export type BrandAssetKind = (typeof brandAssetKindEnum.enumValues)[number];
export type Project = typeof projects.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
/**
 * The marketing intake brief — one per project, the research foundation the
 * orchestrator feeds to every specialist. Answers are a flat map of field id →
 * value (the field set lives in src/server/intake/questions.ts).
 */
export const projectIntake = pgTable("project_intake", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  answers: jsonb("answers")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Calendar events — scheduled marketing items (content, campaigns, launches),
 * each belonging to a project. The calendar reaches them through the project
 * cascade and colors them by project. Times are stored UTC (timestamptz).
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    channel: text("channel"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("calendar_events_project_idx").on(t.projectId),
    index("calendar_events_starts_idx").on(t.startsAt),
  ],
);

/**
 * Deliverables — the durable artifacts the chat produces (a plan, ad-copy set,
 * content calendar write-up, SEO brief…). The chat saves them via a tool; they
 * live under a project and are reached through the same cascade access check.
 * Content is markdown so it renders as a page now and exports/shares later.
 */
export const deliverableKindEnum = pgEnum("deliverable_kind", [
  "plan",
  "ad_copy",
  "calendar",
  "seo",
  "brief",
  "presentation",
  "other",
]);

export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: deliverableKindEnum("kind").notNull().default("other"),
    title: text("title").notNull(),
    // Markdown body. Empty for a freshly-created blank deliverable.
    content: text("content").notNull().default(""),
    // Clerk user id of whoever created it (null if produced by an automated run).
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("deliverables_project_idx").on(t.projectId, t.createdAt)],
);

/**
 * Public share links for a deliverable. A link is an unguessable token that
 * serves a deliverable at /share/<token> with NO login — so it's the one place
 * a scoped resource is reachable without the cascade check. Links are revocable
 * (revokedAt) and optionally expiring (expiresAt); the public resolver honors
 * both. View-only by construction — the public page renders, never mutates.
 */
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverables.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("share_links_deliverable_idx").on(t.deliverableId)],
);

/**
 * Brand memory — the RAG store. Each row is a chunk of brand knowledge (today:
 * one per deliverable) with its embedding, scoped to a BRAND so it cascades to
 * every project inside it ("RAG over your brand data"). On each chat turn we
 * embed the user's message and pull the nearest rows for this brand to ground
 * the reply in past work and voice. 768-dim to match the embedding model
 * (gemini-embedding-001 truncated) and stay under pgvector's ANN index cap.
 */
export const memoryKindEnum = pgEnum("memory_kind", [
  "deliverable",
  "brief",
  "note",
]);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    // Which project it came from (for display/attribution); null for brand-wide notes.
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    kind: memoryKindEnum("kind").notNull().default("deliverable"),
    // The originating row (e.g. a deliverable id), so we can upsert/remove in sync.
    sourceId: uuid("source_id"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("memories_brand_idx").on(t.brandId)],
);

/**
 * Durable jobs — long agent runs that can't fit in one chat request (e.g. a
 * full campaign: strategy → calendar → ad copy, each its own model call). State
 * lives here so the run survives the request: a worker advances status/progress
 * and the UI polls. The execution layer is in-process today; the persisted row
 * is what makes it swappable for Inngest/Trigger.dev later without UI changes.
 */
export const jobKindEnum = pgEnum("job_kind", ["campaign"]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: jobKindEnum("kind").notNull().default("campaign"),
    status: jobStatusEnum("status").notNull().default("queued"),
    // What the user asked for (the campaign goal/prompt).
    goal: text("goal").notNull().default(""),
    // 0–100, plus a human label for the step currently running.
    progress: integer("progress").notNull().default(0),
    step: text("step"),
    // What the run produced (e.g. { deliverableIds, eventCount, summary }).
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("jobs_project_idx").on(t.projectId, t.createdAt)],
);

/**
 * Automations — autonomous agents that run on a cadence and produce work on
 * their own (e.g. a weekly content plan). A scheduler (the /api/cron endpoint)
 * runs the ones that are due; each run generates a deliverable. State lives here
 * so it's durable and observable, independent of what triggers the schedule.
 */
export const automationCadenceEnum = pgEnum("automation_cadence", [
  "daily",
  "weekly",
]);

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // What the agent should do each run, in the user's words.
    goal: text("goal").notNull(),
    cadence: automationCadenceEnum("cadence").notNull().default("weekly"),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("automations_due_idx").on(t.enabled, t.nextRunAt)],
);

export type Thread = typeof threads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
export type ProjectIntake = typeof projectIntake.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;
export type DeliverableKind = (typeof deliverableKindEnum.enumValues)[number];
export type ShareLink = typeof shareLinks.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type Automation = typeof automations.$inferSelect;
export type AutomationCadence = (typeof automationCadenceEnum.enumValues)[number];
export type AiProvider = typeof aiProviders.$inferSelect;
export type AiProviderType = (typeof aiProviderTypeEnum.enumValues)[number];
