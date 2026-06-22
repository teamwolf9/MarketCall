"use client";

/**
 * Export controls for a deliverable. "Save as PDF" uses the browser's print →
 * save-as-PDF on a clean, chrome-free view (the public share page is already
 * laid out for this; app chrome is hidden with `print:hidden`). "Download .md"
 * builds the markdown file client-side from content already on the page — no
 * round-trip, works for the public viewer and the logged-in team alike.
 */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "deliverable"
  );
}

export function ShareActions({
  title,
  content,
  showPdf = true,
}: {
  title: string;
  content: string;
  showPdf?: boolean;
}) {
  function downloadMarkdown() {
    const body = `# ${title}\n\n${content}\n`;
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {showPdf && (
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-outline"
        >
          Save as PDF
        </button>
      )}
      <button type="button" onClick={downloadMarkdown} className="btn btn-outline">
        Download .md
      </button>
    </div>
  );
}
