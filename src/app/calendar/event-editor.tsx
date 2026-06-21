"use client";

import { useState } from "react";
import { toLocalInput } from "@/lib/dates";
import type { CalEvent, CalProject } from "@/lib/calendar-types";

export type EditorTarget =
  | { mode: "create"; projectId?: string; startsAt: Date }
  | { mode: "edit"; event: CalEvent };

export function EventEditor({
  target,
  projects,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: EditorTarget;
  projects: CalProject[];
  onClose: () => void;
  onSaved: (event: CalEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const editing = target.mode === "edit" ? target.event : null;
  const defaultStart =
    target.mode === "create" ? target.startsAt : new Date(target.event.startsAt);
  const defaultEnd =
    editing?.endsAt != null
      ? new Date(editing.endsAt)
      : new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [projectId, setProjectId] = useState(
    editing?.projectId ??
      (target.mode === "create" ? target.projectId : undefined) ??
      projects[0]?.id ??
      "",
  );
  const [starts, setStarts] = useState(toLocalInput(defaultStart));
  const [ends, setEnds] = useState(toLocalInput(defaultEnd));
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [channel, setChannel] = useState(editing?.channel ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !projectId) {
      setError("A title and a project are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      projectId,
      title: title.trim(),
      notes: notes.trim() || null,
      channel: channel.trim() || null,
      startsAt: new Date(starts).toISOString(),
      endsAt: allDay ? null : new Date(ends).toISOString(),
      allDay,
    };
    try {
      const res = await fetch("/api/calendar/events", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Couldn't save this event.");
      onSaved(data.event);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this event.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/calendar/events?id=${editing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onDeleted(editing.id);
    } catch {
      setError("Couldn't delete this event.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-ink">
          {editing ? "Edit event" : "New event"}
        </h2>

        <div className="mt-5 space-y-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title…"
            className="input"
          />

          <label className="block space-y-1.5">
            <span className="label">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brandName} · {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            All day
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="label">Starts</span>
              <input
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
                className="input"
              />
            </label>
            {!allDay && (
              <label className="space-y-1.5">
                <span className="label">Ends</span>
                <input
                  type="datetime-local"
                  value={ends}
                  onChange={(e) => setEnds(e.target.value)}
                  className="input"
                />
              </label>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="label">Channel (optional)</span>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Instagram, Email, Blog…"
              className="input"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="label">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-y"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          {editing ? (
            <button
              onClick={remove}
              disabled={busy}
              className="text-sm text-muted hover:text-danger"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
