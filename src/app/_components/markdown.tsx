import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render a deliverable's markdown into a formatted document. GFM enables tables,
 * task lists, strikethrough, and autolinks. Styling lives in the `.doc` scope in
 * globals.css so it stays on-palette in both themes.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
