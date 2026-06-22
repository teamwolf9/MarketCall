"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { marked } from "marked";
import { saveDeliverable } from "@/server/actions";
import { DELIVERABLE_KINDS } from "@/lib/deliverables";
import { looksLikeHtml } from "@/lib/deliverable-content";
import type { DeliverableKind } from "@/server/db/schema";

/**
 * Word-like WYSIWYG editor. You format the rendered document directly (fonts,
 * sizes, colours, highlight, alignment, lists…). Content is stored as HTML so
 * the rich formatting survives; AI/legacy markdown is converted to HTML on load.
 */
const FONTS = [
  { label: "Default", value: "" },
  { label: "Sans", value: "var(--font-hanken), system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "var(--font-geist-mono), ui-monospace, monospace" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
];
const SIZES = [11, 12, 13, 14, 16, 18, 20, 24, 30];

function Btn({
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-sm transition ${
        active
          ? "bg-accent-soft text-accent-hover"
          : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" />;

function Ribbon({ editor }: { editor: Editor }) {
  const style = editor.getAttributes("textStyle");
  const curSize = style.fontSize ? String(parseInt(style.fontSize, 10)) : "";
  const isAlign = (a: string) => editor.isActive({ textAlign: a });

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-line bg-surface px-2 py-1.5">
      <select
        title="Font"
        value={style.fontFamily ?? ""}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontFamily(e.target.value).run()
            : editor.chain().focus().unsetFontFamily().run()
        }
        className="input h-8 w-24 px-2 py-0 text-sm"
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        title="Font size"
        value={curSize}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontSize(`${e.target.value}px`).run()
            : editor.chain().focus().unsetFontSize().run()
        }
        className="input h-8 w-16 px-2 py-0 text-sm"
      >
        <option value="">Size</option>
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Sep />
      <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </Btn>
      <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </Btn>
      <Btn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Btn>
      <Btn title="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        x₂
      </Btn>
      <Btn title="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        x²
      </Btn>
      <Sep />
      <label title="Text colour" className="flex cursor-pointer items-center rounded-md px-1 py-1 hover:bg-surface-2">
        <span className="text-sm font-semibold text-ink-soft">A</span>
        <input
          type="color"
          value={style.color ?? "#201d18"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="ml-0.5 h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>
      <label title="Highlight" className="flex cursor-pointer items-center rounded-md px-1 py-1 hover:bg-surface-2">
        <span className="text-sm text-ink-soft">🖍</span>
        <input
          type="color"
          defaultValue="#fff3a3"
          onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          className="ml-0.5 h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>
      <Sep />
      <Btn title="Align left" active={isAlign("left")} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        ⯇
      </Btn>
      <Btn title="Align center" active={isAlign("center")} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        ≡
      </Btn>
      <Btn title="Align right" active={isAlign("right")} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        ⯈
      </Btn>
      <Btn title="Justify" active={isAlign("justify")} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        ☰
      </Btn>
      <Sep />
      <Btn title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Btn title="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </Btn>
      <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </Btn>
      <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        ❝
      </Btn>
      <Btn
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") editor.chain().focus().unsetLink().run();
          else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        🔗
      </Btn>
      <Sep />
      <Btn
        title="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        ⌫
      </Btn>
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
  const [, rerender] = useReducer((x) => x + 1, 0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
    ],
    content: looksLikeHtml(initialContent)
      ? initialContent
      : (marked.parse(initialContent ?? "", { async: false }) as string),
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc" } },
    onUpdate: () => setSaved(false),
  });

  // Keep the ribbon's active states + dropdowns in sync with the selection.
  useEffect(() => {
    if (!editor) return;
    const update = () => rerender();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  function save() {
    if (!editor) return;
    const fd = new FormData();
    fd.set("deliverableId", deliverableId);
    fd.set("projectId", projectId);
    fd.set("title", title.trim() || "Untitled deliverable");
    fd.set("kind", kind);
    fd.set("content", editor.getHTML());
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
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary shrink-0">
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="mt-4">
        {editor && <Ribbon editor={editor} />}
        <div className="doc-page rounded-t-none px-8 py-8 sm:px-12">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
