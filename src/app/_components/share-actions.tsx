"use client";

import { marked } from "marked";
import { slugify } from "@/lib/slug";

/**
 * Download a deliverable as PDF or Word. The content is markdown; we render it to
 * HTML (marked) and wrap it in a clean, self-contained document (its own light
 * styles, independent of the app theme) so exports look like a real document:
 *  - PDF  → open a chrome-free print window and let the browser save as PDF.
 *  - Word → a Word-openable .doc (HTML payload) downloaded directly.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DOC_CSS = `
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a18; background: #fff;
         max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.7; }
  h1,h2,h3,h4 { font-weight: 600; line-height: 1.25; }
  h1 { font-size: 28px; margin: 0 0 16px; }
  h2 { font-size: 22px; margin: 28px 0 10px; border-bottom: 1px solid #e3e0d8; padding-bottom: 5px; }
  h3 { font-size: 18px; margin: 22px 0 8px; }
  p { margin: 12px 0; } ul,ol { margin: 12px 0; padding-left: 24px; } li { margin: 5px 0; }
  a { color: #b05730; } strong { font-weight: 600; }
  blockquote { margin: 14px 0; padding: 2px 16px; border-left: 3px solid #c96442; color: #555; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 0.9em; background: #f3f1ea;
         padding: 1px 5px; border-radius: 4px; }
  pre { background: #f3f1ea; padding: 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
  th,td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; } th { background: #f3f1ea; }
  hr { border: 0; border-top: 1px solid #e3e0d8; margin: 28px 0; }
`;

function buildDoc(title: string, markdown: string): string {
  const body = marked.parse(markdown, { async: false }) as string;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${DOC_CSS}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`;
}

export function ShareActions({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  function close(el: HTMLElement) {
    el.closest("details")?.removeAttribute("open");
  }

  function downloadPdf(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    win.document.write(buildDoc(title, content));
    win.document.close();
    win.focus();
    // Give the new document a tick to lay out before invoking print.
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
    download(`${slugify(title)}.doc`, buildDoc(title, content), "application/msword");
  }

  function downloadMarkdown(e: React.MouseEvent<HTMLButtonElement>) {
    close(e.currentTarget);
    download(
      `${slugify(title)}.md`,
      `# ${title}\n\n${content}\n`,
      "text/markdown;charset=utf-8",
    );
  }

  const itemClass =
    "block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink-soft transition hover:bg-surface-2 hover:text-ink";

  return (
    <details className="relative print:hidden">
      <summary className="btn btn-outline cursor-pointer list-none">
        Download
      </summary>
      <div className="card absolute right-0 z-20 mt-1 w-44 p-1 shadow-md">
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
