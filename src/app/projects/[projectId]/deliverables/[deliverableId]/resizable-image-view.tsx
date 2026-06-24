"use client";

import { useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { ImageLayout } from "./resizable-image";

const CORNERS = [
  { key: "nw", pos: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize", dir: -1 },
  { key: "ne", pos: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize", dir: 1 },
  { key: "sw", pos: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize", dir: -1 },
  { key: "se", pos: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize", dir: 1 },
];

const LAYOUTS: { key: ImageLayout; glyph: string; title: string }[] = [
  { key: "left", glyph: "⯇", title: "Inline left" },
  { key: "center", glyph: "≡", title: "Inline center" },
  { key: "right", glyph: "⯈", title: "Inline right" },
  { key: "wrap-left", glyph: "◧", title: "Wrap — image left, text right" },
  { key: "wrap-right", glyph: "◨", title: "Wrap — image right, text left" },
];

function wrapStyle(layout: ImageLayout): React.CSSProperties {
  switch (layout) {
    case "center":
      return { display: "block", marginLeft: "auto", marginRight: "auto", width: "fit-content" };
    case "right":
      return { display: "block", marginLeft: "auto", marginRight: 0, width: "fit-content" };
    case "wrap-left":
      return { float: "left", marginRight: 16, marginBottom: 8 };
    case "wrap-right":
      return { float: "right", marginLeft: 16, marginBottom: 8 };
    default:
      return { display: "inline-block" };
  }
}

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const { src, alt, width, layout } = node.attrs as {
    src: string;
    alt?: string;
    width?: number | null;
    layout?: ImageLayout;
  };
  const current = layout ?? "left";
  const imgRef = useRef<HTMLImageElement>(null);

  function startResize(e: React.MouseEvent, dir: number) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = imgRef.current?.offsetWidth ?? 0;
    const move = (ev: MouseEvent) => {
      const w = Math.max(40, Math.round(startW + dir * (ev.clientX - startX)));
      if (imgRef.current) imgRef.current.style.width = `${w}px`;
    };
    const up = () => {
      const w = imgRef.current?.offsetWidth ?? startW;
      updateAttributes({ width: Math.max(40, Math.round(w)) });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <NodeViewWrapper
      className="relative my-3"
      style={{ lineHeight: 0, ...wrapStyle(current) }}
      data-drag-handle
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        draggable={false}
        style={{
          width: width ? `${width}px` : "auto",
          maxWidth: "100%",
          height: "auto",
          display: "block",
          cursor: editor.isEditable ? "move" : "default",
        }}
        className={selected ? "rounded-sm outline outline-2 outline-accent" : "rounded-sm"}
      />

      {editor.isEditable && selected && (
        <>
          {/* Layout toolbar: inline align + text wrap */}
          <div
            className="absolute -top-9 left-0 z-20 flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5 shadow"
            contentEditable={false}
          >
            {LAYOUTS.map((l, i) => (
              <span key={l.key} className="flex items-center">
                {i === 3 && <span className="mx-0.5 h-5 w-px bg-line" />}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateAttributes({ layout: l.key });
                  }}
                  className={`flex h-6 w-6 items-center justify-center rounded text-sm ${
                    current === l.key
                      ? "bg-accent-soft text-accent-hover"
                      : "text-ink-soft hover:bg-surface-2"
                  }`}
                  title={l.title}
                >
                  {l.glyph}
                </button>
              </span>
            ))}
          </div>

          {/* Resize handles */}
          {CORNERS.map((c) => (
            <span
              key={c.key}
              onMouseDown={(e) => startResize(e, c.dir)}
              className={`absolute z-10 h-3 w-3 rounded-sm border border-paper bg-accent shadow ${c.pos}`}
            />
          ))}
        </>
      )}
    </NodeViewWrapper>
  );
}
