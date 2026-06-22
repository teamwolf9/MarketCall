/**
 * Deliverable content is HTML once edited in the rich editor, but AI-generated
 * and legacy content is markdown. This heuristic lets readers/exporters handle
 * both: HTML is rendered as-is, markdown is converted first.
 */
export function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}
