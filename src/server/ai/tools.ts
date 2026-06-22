import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { calendarEvents } from "@/server/db/schema";
import { createEvent } from "@/server/calendar";
import { createDeliverable } from "@/server/deliverables";

/**
 * Tools that let the chat *act* on the project, not just advise. Each tool is a
 * thin, access-checked wrapper over an existing server function — the same
 * cascade rule the rest of the app uses. Tools are built per-request and closed
 * over the caller + the project the thread lives in, so a tool can only ever
 * touch the project the user is already chatting in (it never takes a projectId
 * from the model — that would let the model reach across the access boundary).
 *
 * Load-bearing principle: draft, don't publish. These tools write to our own
 * data (the calendar) — they never touch a live client account.
 */
export type ToolContext = {
  userId: string;
  projectId: string;
  projectName: string;
};

/** Parse a model-supplied date string; returns null if unusable. */
function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function projectTools(ctx: ToolContext) {
  return {
    schedule_calendar_event: tool({
      description:
        "Add a marketing item (a post, email, campaign milestone, or launch) to THIS project's content calendar so it appears in the calendar view. Call this whenever the user asks to schedule something, plan dates, or 'put it on the calendar' — actually create the events, don't just describe them. After creating, briefly confirm the date you used.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Short title, e.g. 'Instagram launch teaser' or 'Welcome email #1'."),
        date: z
          .string()
          .describe(
            "When it's scheduled, ISO 8601. Date-only ('2026-07-01') for an all-day item, or full datetime ('2026-07-01T14:00:00') for a specific time.",
          ),
        channel: z
          .string()
          .nullish()
          .describe("Channel/platform, e.g. Instagram, Email, Blog, TikTok. Optional."),
        notes: z
          .string()
          .nullish()
          .describe("Optional brief/notes for the item — hook, angle, or details."),
        allDay: z
          .boolean()
          .nullish()
          .describe("True when there's no specific time. Defaults to true if only a date is given."),
      }),
      execute: async ({ title, date, channel, notes, allDay }) => {
        // A bare date ("2026-07-01") parses as UTC midnight in JS, but the rest
        // of the app treats wall-clock time as local — so force local midnight
        // for date-only input, matching the manual event editor's behavior.
        const hasTime = /T\d/.test(date);
        const startsAt = parseDate(hasTime ? date : `${date}T00:00:00`);
        if (!startsAt) return { ok: false, error: `Could not understand the date "${date}".` };
        const isAllDay = allDay ?? !hasTime;
        const event = await createEvent(ctx.userId, {
          projectId: ctx.projectId,
          title,
          channel: channel ?? null,
          notes: notes ?? null,
          startsAt,
          allDay: isAllDay,
        });
        if (!event) {
          return { ok: false, error: "You don't have edit access to this project's calendar." };
        }
        return {
          ok: true,
          id: event.id,
          title: event.title,
          channel: event.channel,
          startsAt: event.startsAt.toISOString(),
          allDay: event.allDay,
        };
      },
    }),

    save_deliverable: tool({
      description:
        "Save a finished piece of work to THIS project as a deliverable so the user can revisit, edit, and later share it. Use this whenever you produce something substantial and reusable — a campaign plan, a set of ad-copy variants, a content-calendar write-up, or an SEO brief. Pass the full work as markdown in `content`. Don't save trivial chit-chat or a single clarifying answer. After saving, tell the user it's saved and that it's on the project's Deliverables tab.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("A clear, specific title, e.g. 'Q3 Launch Campaign Plan' or 'Meta Ad Copy — Spring Sale'."),
        kind: z
          .enum(["plan", "ad_copy", "calendar", "seo", "brief", "other"])
          .describe("The type of deliverable. Use 'other' if none fit."),
        content: z
          .string()
          .describe("The full deliverable as markdown — headings, lists, tables as needed."),
      }),
      execute: async ({ title, kind, content }) => {
        const row = await createDeliverable(ctx.userId, {
          projectId: ctx.projectId,
          title,
          kind,
          content,
        });
        if (!row) {
          return { ok: false, error: "You don't have edit access to save deliverables in this project." };
        }
        return { ok: true, id: row.id, title: row.title, kind: row.kind };
      },
    }),

    list_calendar_events: tool({
      description:
        "List items already on THIS project's calendar within a date range. Use it to check what's planned before adding new items (so you don't double-book) or to answer questions about the current schedule.",
      inputSchema: z.object({
        from: z.string().describe("Range start, ISO date, e.g. '2026-07-01'."),
        to: z.string().describe("Range end (exclusive), ISO date, e.g. '2026-08-01'."),
      }),
      execute: async ({ from, to }) => {
        const f = parseDate(from);
        const t = parseDate(to);
        if (!f || !t) return { ok: false, error: "Invalid date range." };
        const rows = await db
          .select()
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.projectId, ctx.projectId),
              gte(calendarEvents.startsAt, f),
              lt(calendarEvents.startsAt, t),
            ),
          )
          .orderBy(asc(calendarEvents.startsAt));
        return {
          ok: true,
          count: rows.length,
          events: rows.map((e) => ({
            id: e.id,
            title: e.title,
            channel: e.channel,
            startsAt: e.startsAt.toISOString(),
            allDay: e.allDay,
          })),
        };
      },
    }),
  };
}
