"use client";

import { useState, useTransition } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import TurndownService from "turndown";
import { saveDeliverable } from "@/server/actions";
import { DELIVERABLE_KINDS } from "@/lib/deliverables";
import type { DeliverableKind } from "@/server/db/schema";

/**
 * Single-screen WYSIWYG: you edit the formatted document directly — no separate
 * markdown pane. Content is still stored as markdown (so the share page, exports,
 * and brand-memory stay markdown and safe): we render markdown → HTML on load
 * (marked) and serialize HTML → markdown on save (turndown).
 */
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      // Keep the editor selection while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-8 rounded-md px-2 py-1 text-sm transition ${
        active
          ? "bg-accent-soft text-accent-hover"
          : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-3 py-2">
      <ToolbarButton
        title="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-line" />
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {"</>"}
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-line" />
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>
    </div>
  );
}

export function DeliverableEditor({
  deliverableId,
  projectId,
  initialTitle,
  initialKind,
  initialContent,
}: {
  deliverableId: string;
  projectId: string;
  initialTitle: string;
  initialKind: DeliverableKind;
  initialContent: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [kind, setKind] = useState<DeliverableKind>(initialKind);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: marked.parse(initialContent ?? "", { async: false }) as string,
    immediatelyRender: false, // required under Next SSR to avoid hydration mismatch
    editorProps: {
      attributes: { class: "doc min-h-[55vh] focus:outline-none" },
    },
    onUpdate: () => setSaved(false),
  });

  function save() {
    if (!editor) return;
    const markdown = turndown.turndown(editor.getHTML());
    const fd = new FormData();
    fd.set("deliverableId", deliverableId);
    fd.set("projectId", projectId);
    fd.set("title", title.trim() || "Untitled deliverable");
    fd.set("kind", kind);
    fd.set("content", markdown);
    startTransition(async () => {
      await saveDeliverable(fd);
      setSaved(true);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
          placeholder="Deliverable title…"
          className="input min-w-0 flex-1 font-display text-lg"
        />
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as DeliverableKind);
            setSaved(false);
          }}
          className="input w-40 shrink-0"
        >
          {DELIVERABLE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn btn-primary shrink-0"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="card mt-4 overflow-hidden">
        {editor && <Toolbar editor={editor} />}
        <div className="px-7 py-6 sm:px-9">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
