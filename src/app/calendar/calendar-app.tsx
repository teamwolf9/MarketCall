"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  hourLabel,
  isSameDay,
  isSameMonth,
  monthGrid,
  monthLabel,
  startOfMonth,
  startOfWeek,
  timeLabel,
  weekDays,
  weekLabel,
  WEEKDAYS,
} from "@/lib/dates";
import { projectColor } from "@/lib/colors";
import type { CalEvent, CalProject } from "@/lib/calendar-types";
import { EventEditor, type EditorTarget } from "./event-editor";

const HOUR = 48; // px per hour in week view

export function CalendarApp({ projects }: { projects: CalProject[] }) {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [today] = useState(() => new Date());
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.id)),
  );
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [editor, setEditor] = useState<EditorTarget | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, CalProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const range = useMemo(() => {
    if (view === "month") {
      const from = startOfWeek(startOfMonth(cursor));
      return { from, to: addDays(from, 42) };
    }
    const from = startOfWeek(cursor);
    return { from, to: addDays(from, 7) };
  }, [view, cursor]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    const res = await fetch(`/api/calendar/events?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events as CalEvent[]);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => events.filter((e) => selected.has(e.projectId)),
    [events, selected],
  );

  function eventsOn(day: Date): CalEvent[] {
    return visible
      .filter((e) => isSameDay(new Date(e.startsAt), day))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  function toggleProject(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const allOn = selected.size === projects.length;

  function onSaved(ev: CalEvent) {
    setEvents((list) => {
      const i = list.findIndex((e) => e.id === ev.id);
      if (i === -1) return [...list, ev];
      const copy = [...list];
      copy[i] = ev;
      return copy;
    });
    // Make sure the event's project is visible so it doesn't vanish.
    setSelected((s) => (s.has(ev.projectId) ? s : new Set(s).add(ev.projectId)));
    setEditor(null);
  }

  function onDeleted(id: string) {
    setEvents((list) => list.filter((e) => e.id !== id));
    setEditor(null);
  }

  const periodLabel = view === "month" ? monthLabel(cursor) : weekLabel(cursor);
  const step = (dir: number) =>
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addDays(c, dir * 7)));

  return (
    <div className="flex h-full min-h-0">
      {/* Left rail */}
      <aside className="flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line px-4 py-5">
        <MiniMonth
          cursor={cursor}
          today={today}
          onPick={(d) => setCursor(d)}
          onStep={(dir) => setCursor((c) => addMonths(c, dir))}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Projects</span>
            <button
              onClick={() =>
                setSelected(allOn ? new Set() : new Set(projects.map((p) => p.id)))
              }
              className="text-xs text-accent hover:text-accent-hover"
            >
              {allOn ? "None" : "All"}
            </button>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted">No projects yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {projects.map((p) => {
                const c = projectColor(p.id);
                const on = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => toggleProject(p.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-[4px] border"
                        style={{
                          background: on ? c.dot : "transparent",
                          borderColor: c.dot,
                        }}
                      />
                      <span
                        className={`truncate ${on ? "text-ink" : "text-muted"}`}
                      >
                        {p.name}
                        <span className="text-muted"> · {p.brandName}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCursor(new Date())}
              className="btn btn-outline"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                onClick={() => step(-1)}
                className="btn btn-ghost px-2"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                onClick={() => step(1)}
                className="btn btn-ghost px-2"
                aria-label="Next"
              >
                ›
              </button>
            </div>
            <h1 className="font-display text-xl font-semibold text-ink">
              {periodLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line-strong p-0.5 text-sm">
              {(["month", "week"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 capitalize ${
                    view === v
                      ? "bg-surface-2 text-ink"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {projects.length > 0 && (
              <button
                onClick={() =>
                  setEditor({
                    mode: "create",
                    startsAt: at9am(cursor),
                  })
                }
                className="btn btn-primary"
              >
                + Event
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {view === "month" ? (
          <MonthView
            cursor={cursor}
            today={today}
            eventsOn={eventsOn}
            project={(id) => byId.get(id)}
            onCreate={(d) => setEditor({ mode: "create", startsAt: at9am(d) })}
            onEdit={(ev) => setEditor({ mode: "edit", event: ev })}
          />
        ) : (
          <WeekView
            cursor={cursor}
            today={today}
            eventsOn={eventsOn}
            project={(id) => byId.get(id)}
            onCreate={(d) => setEditor({ mode: "create", startsAt: d })}
            onEdit={(ev) => setEditor({ mode: "edit", event: ev })}
          />
        )}
      </div>

      {editor && (
        <EventEditor
          target={editor}
          projects={projects}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function at9am(d: Date): Date {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
}

function MiniMonth({
  cursor,
  today,
  onPick,
  onStep,
}: {
  cursor: Date;
  today: Date;
  onPick: (d: Date) => void;
  onStep: (dir: number) => void;
}) {
  const days = monthGrid(cursor);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{monthLabel(cursor)}</span>
        <div className="flex">
          <button onClick={() => onStep(-1)} className="px-1.5 text-ink-soft hover:text-ink">
            ‹
          </button>
          <button onClick={() => onStep(1)} className="px-1.5 text-ink-soft hover:text-ink">
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px] text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w[0]}</div>
        ))}
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          const inMonth = isSameMonth(d, cursor);
          const isCursor = isSameDay(d, cursor);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(d)}
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                isToday
                  ? "bg-accent text-accent-ink"
                  : isCursor
                    ? "bg-accent-soft text-accent-hover"
                    : inMonth
                      ? "text-ink hover:bg-surface-2"
                      : "text-muted hover:bg-surface-2"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({
  cursor,
  today,
  eventsOn,
  project,
  onCreate,
  onEdit,
}: {
  cursor: Date;
  today: Date;
  eventsOn: (d: Date) => CalEvent[];
  project: (id: string) => CalProject | undefined;
  onCreate: (d: Date) => void;
  onEdit: (ev: CalEvent) => void;
}) {
  const days = monthGrid(cursor);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-xs font-medium text-muted">
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {days.map((d) => {
          const list = eventsOn(d);
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              onClick={() => onCreate(d)}
              className={`group min-h-[92px] cursor-pointer border-b border-r border-line p-1 ${
                inMonth ? "" : "bg-surface-2/40"
              }`}
            >
              <div className="flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-accent text-accent-ink"
                      : inMonth
                        ? "text-ink-soft"
                        : "text-muted"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, 3).map((ev) => {
                  const c = projectColor(ev.projectId);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(ev);
                      }}
                      title={`${ev.title} — ${project(ev.projectId)?.name ?? ""}`}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {!ev.allDay && (
                        <span className="opacity-70">
                          {timeLabel(new Date(ev.startsAt))}{" "}
                        </span>
                      )}
                      {ev.title}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <div className="px-1.5 text-[10px] text-muted">
                    +{list.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  cursor,
  today,
  eventsOn,
  project,
  onCreate,
  onEdit,
}: {
  cursor: Date;
  today: Date;
  eventsOn: (d: Date) => CalEvent[];
  project: (id: string) => CalProject | undefined;
  onCreate: (d: Date) => void;
  onEdit: (ev: CalEvent) => void;
}) {
  const days = weekDays(cursor);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-line">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} className="px-2 py-2 text-center">
              <div className="text-xs text-muted">{WEEKDAYS[d.getDay()]}</div>
              <div
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  isToday ? "bg-accent text-accent-ink" : "text-ink"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
          {/* Hour gutter */}
          <div>
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR }}
                className="relative -top-2 pr-2 text-right text-[10px] text-muted"
              >
                {h === 0 ? "" : hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const list = eventsOn(d).filter((e) => !e.allDay);
            return (
              <div
                key={d.toISOString()}
                className="relative border-l border-line"
                style={{ height: HOUR * 24 }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => {
                      const dt = new Date(d);
                      dt.setHours(h, 0, 0, 0);
                      onCreate(dt);
                    }}
                    style={{ height: HOUR }}
                    className="cursor-pointer border-t border-line hover:bg-surface-2/40"
                  />
                ))}
                {list.map((ev) => {
                  const start = new Date(ev.startsAt);
                  const end = ev.endsAt
                    ? new Date(ev.endsAt)
                    : new Date(start.getTime() + 60 * 60 * 1000);
                  const top = (start.getHours() * 60 + start.getMinutes()) * (HOUR / 60);
                  const mins = Math.max(
                    20,
                    (end.getTime() - start.getTime()) / 60000,
                  );
                  const height = Math.max(18, (mins * HOUR) / 60);
                  const c = projectColor(ev.projectId);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(ev);
                      }}
                      title={`${ev.title} — ${project(ev.projectId)?.name ?? ""}`}
                      style={{
                        top,
                        height,
                        background: c.bg,
                        borderColor: c.border,
                        color: c.text,
                      }}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight"
                    >
                      <div className="truncate font-medium">{ev.title}</div>
                      <div className="truncate opacity-70">
                        {timeLabel(start)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
