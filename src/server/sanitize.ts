import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitize rich-text HTML before it's stored. The editor produces schema-safe
 * HTML, but `saveDeliverable` is a server action a malicious editor could call
 * directly with crafted markup — and that content is later rendered on the
 * PUBLIC share page. So we whitelist exactly the tags/attributes the Word-like
 * editor emits (including the inline styles for colour/font/size/alignment) and
 * drop everything else: no <script>, no event handlers, no javascript: URLs.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "strong", "b", "em", "i", "u", "s", "strike", "mark",
    "sub", "sup", "span", "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^[a-z-]+$/i],
      "background-color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^[a-z-]+$/i],
      "font-family": [/^[\w\s,'"()-]+$/],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|pt)$/],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  // Only safe URL schemes; blocks javascript:/data: in links.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

export function sanitizeDeliverableHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
