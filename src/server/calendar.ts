import "server-only";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  calendarEvents,
  projects,
  brands,
  type CalendarEvent,
} from "@/server/db/schema";
import {
  reachableProjectIds,
  projectRole,
  roleAtLeast,
} from "@/server/auth/access";

export type CalendarProject = {
  id: string;
  name: string;
  brandName: string;
};

/** Projects the user can put on the calendar (for the filter rail). */
export async function listCalendarProjects(
  userId: string,
): Promise<CalendarProject[]> {
  const ids = await reachableProjectIds(userId);
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      brandName: brands.name,
    })
    .from(projects)
    .innerJoin(brands, eq(projects.brandId, brands.id))
    .where(inArray(projects.id, ids))
    .orderBy(asc(brands.name), asc(projects.name));
  return rows;
}

/** Events in [from, to) across the user's reachable projects. */
export async function listEventsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<CalendarEvent[]> {
  const ids = await reachableProjectIds(userId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        inArray(calendarEvents.projectId, ids),
        gte(calendarEvents.startsAt, from),
        lt(calendarEvents.startsAt, to),
      ),
    )
    .orderBy(asc(calendarEvents.startsAt));
}

export type UpcomingEvent = CalendarEvent & { projectName: string };

/**
 * Upcoming events across a brand's projects (the ones the user can reach),
 * from the start of today forward, soonest first — for the brand dashboard's
 * "Upcoming" list. Access is the intersection of the brand's projects and the
 * user's reachable set, so it never leaks a project they can't see.
 */
export async function listUpcomingForBrand(
  userId: string,
  brandId: string,
  limit = 50,
): Promise<UpcomingEvent[]> {
  const ids = await reachableProjectIds(userId);
  if (ids.length === 0) return [];
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return db
    .select({
      id: calendarEvents.id,
      projectId: calendarEvents.projectId,
      title: calendarEvents.title,
      notes: calendarEvents.notes,
      channel: calendarEvents.channel,
      startsAt: calendarEvents.startsAt,
      endsAt: calendarEvents.endsAt,
      allDay: calendarEvents.allDay,
      createdAt: calendarEvents.createdAt,
      projectName: projects.name,
    })
    .from(calendarEvents)
    .innerJoin(projects, eq(calendarEvents.projectId, projects.id))
    .where(
      and(
        eq(projects.brandId, brandId),
        inArray(calendarEvents.projectId, ids),
        gte(calendarEvents.startsAt, from),
      ),
    )
    .orderBy(asc(calendarEvents.startsAt))
    .limit(limit);
}

async function canEditProject(userId: string, projectId: string) {
  return roleAtLeast(await projectRole(userId, projectId), "editor");
}

export type EventInput = {
  projectId: string;
  title: string;
  notes?: string | null;
  channel?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  allDay?: boolean;
};

export async function createEvent(
  userId: string,
  input: EventInput,
): Promise<CalendarEvent | null> {
  if (!(await canEditProject(userId, input.projectId))) return null;
  const [row] = await db
    .insert(calendarEvents)
    .values({
      projectId: input.projectId,
      title: input.title,
      notes: input.notes ?? null,
      channel: input.channel ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      allDay: input.allDay ?? false,
    })
    .returning();
  return row;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  patch: Partial<EventInput>,
): Promise<CalendarEvent | null> {
  const existing = await db.query.calendarEvents.findFirst({
    where: eq(calendarEvents.id, eventId),
  });
  if (!existing) return null;
  // Must be able to edit the current project (and the target, if moving).
  if (!(await canEditProject(userId, existing.projectId))) return null;
  if (patch.projectId && patch.projectId !== existing.projectId) {
    if (!(await canEditProject(userId, patch.projectId))) return null;
  }
  const [row] = await db
    .update(calendarEvents)
    .set({
      ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.channel !== undefined ? { channel: patch.channel } : {}),
      ...(patch.startsAt !== undefined ? { startsAt: patch.startsAt } : {}),
      ...(patch.endsAt !== undefined ? { endsAt: patch.endsAt } : {}),
      ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
    })
    .where(eq(calendarEvents.id, eventId))
    .returning();
  return row;
}

export async function deleteEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const existing = await db.query.calendarEvents.findFirst({
    where: eq(calendarEvents.id, eventId),
  });
  if (!existing) return false;
  if (!(await canEditProject(userId, existing.projectId))) return false;
  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  return true;
}
