import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { looksLikeHtml } from "@/lib/deliverable-content";

/**
 * Render a deliverable's body as a formatted document. New content is rich HTML
 * from the editor (rendered as-is — it's schema-safe TipTap output); AI/legacy
 * content is markdown (rendered via react-markdown, which never emits raw HTML).
 * Styling lives in the `.doc` scope in globals.css.
 */
export function Markdown({ children }: { children: string }) {
  if (looksLikeHtml(children)) {
    return <div className="doc" dangerouslySetInnerHTML={{ __html: children }} />;
  }
  return (
    <div className="doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
