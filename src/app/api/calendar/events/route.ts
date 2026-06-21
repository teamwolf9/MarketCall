import { auth } from "@clerk/nextjs/server";
import {
  listEventsInRange,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/server/calendar";

/** Parse a value to a Date, or null if missing/invalid. */
function parseDate(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  if (!from || !to) return new Response("from/to required", { status: 400 });

  const events = await listEventsInRange(userId, from, to);
  return Response.json({ events });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const b = await req.json();
  const startsAt = parseDate(b?.startsAt);
  if (!b?.projectId || !b?.title?.trim() || !startsAt) {
    return new Response("projectId, title, startsAt required", { status: 400 });
  }
  const event = await createEvent(userId, {
    projectId: b.projectId,
    title: String(b.title).trim(),
    notes: b.notes ?? null,
    channel: b.channel ?? null,
    startsAt,
    endsAt: b.allDay ? null : parseDate(b?.endsAt),
    allDay: !!b.allDay,
  });
  if (!event) return new Response("Forbidden", { status: 403 });
  return Response.json({ event });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const b = await req.json();
  if (!b?.id) return new Response("id required", { status: 400 });

  const ps = b.startsAt !== undefined ? parseDate(b.startsAt) : undefined;
  const pe = b.endsAt !== undefined ? parseDate(b.endsAt) : undefined;

  const event = await updateEvent(userId, b.id, {
    ...(b.projectId !== undefined ? { projectId: b.projectId } : {}),
    ...(b.title !== undefined ? { title: String(b.title).trim() } : {}),
    ...(b.notes !== undefined ? { notes: b.notes } : {}),
    ...(b.channel !== undefined ? { channel: b.channel } : {}),
    ...(ps ? { startsAt: ps } : {}),
    ...(pe !== undefined ? { endsAt: pe } : {}),
    ...(b.allDay !== undefined ? { allDay: !!b.allDay } : {}),
  });
  if (!event) return new Response("Forbidden", { status: 403 });
  return Response.json({ event });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response("id required", { status: 400 });
  const ok = await deleteEvent(userId, id);
  if (!ok) return new Response("Forbidden", { status: 403 });
  return Response.json({ ok: true });
}
