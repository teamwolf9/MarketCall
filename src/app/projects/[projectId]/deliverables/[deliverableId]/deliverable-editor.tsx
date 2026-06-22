"use client";

import { useState, useTransition } from "react";
import { saveDeliverable } from "@/server/actions";
import { Markdown } from "@/app/_components/markdown";
import { DELIVERABLE_KINDS, kindLabel } from "@/lib/deliverables";
import type { DeliverableKind } from "@/server/db/schema";

/**
 * Deliverable view + editor. Defaults to the formatted document; editors can flip
 * to Edit, where a textarea sits beside a live preview that re-renders as they
 * type. Saving persists via the server action and returns to the formatted view,
 * which then reflects the update.
 */
export function DeliverableEditor({
  deliverableId,
  projectId,
  initialTitle,
  initialKind,
  initialContent,
  canEdit,
}: {
  deliverableId: string;
  projectId: string;
  initialTitle: string;
  initialKind: DeliverableKind;
  initialContent: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [kind, setKind] = useState<DeliverableKind>(initialKind);
  const [content, setContent] = useState(initialContent);
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("deliverableId", deliverableId);
    fd.set("projectId", projectId);
    fd.set("title", title.trim() || "Untitled deliverable");
    fd.set("kind", kind);
    fd.set("content", content);
    startTransition(async () => {
      await saveDeliverable(fd);
      setEditing(false);
    });
  }

  function cancel() {
    setTitle(initialTitle);
    setKind(initialKind);
    setContent(initialContent);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <span className="badge">{kindLabel(kind)}</span>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-outline shrink-0"
            >
              Edit
            </button>
          )}
        </div>

        <div className="card mt-5 p-7 sm:p-9">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-sm text-muted">
              This deliverable is empty.{canEdit ? " Click Edit to add content." : ""}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deliverable title…"
          className="input min-w-0 flex-1 font-display text-lg"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as DeliverableKind)}
          className="input w-40 shrink-0"
        >
          {DELIVERABLE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <span className="label">Markdown</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the deliverable in markdown…"
            className="input mt-2 h-[60vh] w-full resize-none font-mono text-sm leading-relaxed"
          />
        </div>
        <div className="min-w-0">
          <span className="label">Preview</span>
          <div className="card mt-2 h-[60vh] overflow-auto p-6">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-muted">Preview appears here as you type.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
