import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./resizable-image-view";

/**
 * The Image node with Word-like layout, all of which survive saving, the public
 * share page, and PDF/Word exports:
 *  - `width`  → HTML width attribute (corner-handle resize)
 *  - `layout` → inline left/center/right, OR float wrap-left/wrap-right so text
 *               flows around the image
 *  - draggable → drag the image to a new position in the document flow
 */
export type ImageLayout = "left" | "center" | "right" | "wrap-left" | "wrap-right";

function layoutStyle(layout: ImageLayout): string {
  switch (layout) {
    case "center":
      return "display:block;margin-left:auto;margin-right:auto";
    case "right":
      return "display:block;margin-left:auto;margin-right:0";
    case "wrap-left":
      return "float:left;margin-right:16px;margin-bottom:8px";
    case "wrap-right":
      return "float:right;margin-left:16px;margin-bottom:8px";
    default:
      return "";
  }
}

export const ResizableImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? parseInt(w, 10) || null : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { width: Math.round(attrs.width as number) } : {},
      },
      layout: {
        default: "left" as ImageLayout,
        parseHTML: (el): ImageLayout => {
          const f = el.style.float;
          if (f === "left") return "wrap-left";
          if (f === "right") return "wrap-right";
          const ml = el.style.marginLeft;
          const mr = el.style.marginRight;
          if (ml === "auto" && mr === "auto") return "center";
          if (ml === "auto") return "right";
          return "left";
        },
        renderHTML: (attrs) => {
          const style = layoutStyle((attrs.layout as ImageLayout) ?? "left");
          return style ? { style } : {};
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
