"use client";

import { marked } from "marked";
import { slugify } from "@/lib/slug";
import { looksLikeHtml } from "@/lib/deliverable-content";
import { hex6, type ExportTokens } from "@/lib/brand-guide";

/**
 * Download a deliverable as PDF / Word / PowerPoint. Content is markdown; we
 * render it to HTML (marked) and wrap it in a clean document. Colors and fonts
 * come from the brand guide (via `tokens`), so every export is on-brand; when no
 * guide is set, the defaults match the app's "Clay" look.
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Tokens = {
  accent: string;
  ink: string;
  paper: string;
  heading: string;
  body: string;
  brandName?: string;
  logoUrl?: string | null;
};

function resolve(tokens?: ExportTokens): Tokens {
  return {
    accent: tokens?.accent ?? "#C96442",
    ink: tokens?.ink ?? "#201D18",
    paper: tokens?.paper ?? "#FAF9F5",
    heading: tokens?.heading ?? "Georgia",
    body: tokens?.body ?? "Georgia",
    brandName: tokens?.brandName,
    logoUrl: tokens?.logoUrl ?? null,
  };
}

function docCss(t: Tokens): string {
  return `
  body { font-family: ${t.body}, Georgia, serif; color: ${t.ink}; background: #fff;
         max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.7; }
  h1,h2,h3,h4 { font-family: ${t.heading}, Georgia, serif; font-weight: 600; line-height: 1.25; color: ${t.ink}; }
  h1 { font-size: 28px; margin: 0 0 16px; }
  h2 { font-size: 22px; margin: 28px 0 10px; border-bottom: 1px solid ${t.accent}40; padding-bottom: 5px; }
  h3 { font-size: 18px; margin: 22px 0 8px; }
  p { margin: 12px 0; } ul,ol { margin: 12px 0; padding-left: 24px; } li { margin: 5px 0; }
  a { color: ${t.accent}; } strong { font-weight: 600; }
  blockquote { margin: 14px 0; padding: 2px 16px; border-left: 3px solid ${t.accent}; color: #555; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 0.9em; background: #f3f1ea;
         padding: 1px 5px; border-radius: 4px; }
  pre { background: #f3f1ea; padding: 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
  th,td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; } th { background: #f3f1ea; }
  hr { border: 0; border-top: 1px solid ${t.accent}33; margin: 28px 0; }
  .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .brand-header img { height: 36px; width: auto; }
  .brand-header span { font-size: 14px; color: ${t.accent}; letter-spacing: 0.02em; }
`;
}

function toHtml(content: string): string {
  return looksLikeHtml(content)
    ? content
    : (marked.parse(content, { async: false }) as string);
}

function buildDoc(title: string, content: string, t: Tokens): string {
  const header =
    t.logoUrl || t.brandName
      ? `<div class="brand-header">${t.logoUrl ? `<img src="${t.logoUrl}" alt="">` : ""}${t.brandName ? `<span>${esc(t.brandName)}</span>` : ""}</div>`
      : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${docCss(t)}</style></head><body>${header}<h1>${esc(title)}</h1>${toHtml(content)}</body></html>`;
}

type Slide = { title: string; bullets: { text: string; bold?: boolean }[]; notes?: string };

/** Parse a deliverable's HTML into slides: each heading starts a slide. */
function toSlides(content: string): Slide[] {
  const body = new DOMParser().parseFromString(toHtml(content), "text/html").body;
  const slides: Slide[] = [];
  let cur: Slide | null = null;
  const ensure = () => (cur ??= (slides.push({ title: "", bullets: [] }), slides[slides.length - 1]));
  for (const el of Array.from(body.children)) {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? "").trim();
    if (tag === "h1" || tag === "h2") {
      cur = { title: text, bullets: [] };
      slides.push(cur);
    } else if (tag === "h3" || tag === "h4") {
      ensure().bullets.push({ text, bold: true });
    } else if (tag === "ul" || tag === "ol") {
      el.querySelectorAll(":scope > li").forEach((li) =>
        ensure().bullets.push({ text: (li.textContent ?? "").trim() }),
      );
    } else if (tag === "blockquote") {
      if (cur) cur.notes = `${cur.notes ? cur.notes + "\n" : ""}${text}`;
    } else if (text) {
      ensure().bullets.push({ text });
    }
  }
  return slides.filter((s) => s.title || s.bullets.length);
}

export function ShareActions({
  title,
  content,
  tokens,
}: {
  title: string;
  content: string;
  tokens?: ExportTokens;
}) {
  const t = resolve(tokens);

  function close(el: HTMLElement) {
    el.closest("details")?.removeAttribute("open");
  }

  function downloadPdf(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    win.document.write(buildDoc(title, content, t));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }

  function download(name: string, data: string, type: string) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadWord(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    download(`${slugify(title)}.doc`, buildDoc(title, content, t), "application/msword");
  }

  function downloadMarkdown(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    download(`${slugify(title)}.md`, `# ${title}\n\n${content}\n`, "text/markdown;charset=utf-8");
  }

  async function downloadPptx(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    const PptxGen = (await import("pptxgenjs")).default;
    const pptx = new PptxGen();
    pptx.layout = "LAYOUT_WIDE";
    const ACCENT = hex6(t.accent);
    const INK = hex6(t.ink);
    const PAPER = hex6(t.paper);

    // Title slide.
    const cover = pptx.addSlide();
    cover.background = { color: PAPER };
    cover.addText(title, {
      x: 0.6, y: 2.1, w: "88%", h: 1.5,
      fontSize: 40, bold: true, color: INK, fontFace: t.heading,
    });
    cover.addShape(pptx.ShapeType.line, {
      x: 0.62, y: 3.5, w: 3, h: 0, line: { color: ACCENT, width: 2.5 },
    });
    if (t.brandName) {
      cover.addText(t.brandName, { x: 0.6, y: 3.7, fontSize: 18, color: ACCENT, fontFace: t.body });
    }

    // Content slides.
    for (const s of toSlides(content)) {
      const slide = pptx.addSlide();
      slide.background = { color: PAPER };
      slide.addText(s.title || title, {
        x: 0.6, y: 0.4, w: "88%", h: 0.8,
        fontSize: 28, bold: true, color: INK, fontFace: t.heading,
      });
      slide.addShape(pptx.ShapeType.line, {
        x: 0.62, y: 1.2, w: 2.2, h: 0, line: { color: ACCENT, width: 2 },
      });
      if (s.bullets.length) {
        slide.addText(
          s.bullets.map((b) => ({
            text: b.text,
            options: { bullet: true, bold: b.bold, fontSize: 18, color: INK, fontFace: t.body, paraSpaceAfter: 8 },
          })),
          { x: 0.7, y: 1.5, w: "86%", h: 5, valign: "top" },
        );
      }
      if (s.notes) slide.addNotes(s.notes);
    }

    await pptx.writeFile({ fileName: `${slugify(title)}.pptx` });
  }

  const itemClass =
    "block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink-soft transition hover:bg-surface-2 hover:text-ink";

  return (
    <details className="relative print:hidden">
      <summary className="btn btn-outline cursor-pointer list-none">Download</summary>
      <div className="card absolute right-0 z-20 mt-1 w-44 p-1 shadow-md">
        <button type="button" onClick={downloadPptx} className={itemClass}>
          PowerPoint (.pptx)
        </button>
        <button type="button" onClick={downloadPdf} className={itemClass}>
          PDF
        </button>
        <button type="button" onClick={downloadWord} className={itemClass}>
          Word (.doc)
        </button>
        <button type="button" onClick={downloadMarkdown} className={itemClass}>
          Markdown (.md)
        </button>
      </div>
    </details>
  );
}
