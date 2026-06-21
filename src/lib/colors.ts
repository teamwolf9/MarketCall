/**
 * Stable per-project colors for the calendar — each project gets a consistent
 * hue derived from its id, so events are visually grouped without storing a
 * color. Tones are tuned to sit calmly on the warm "Studio" palette.
 */
export type ProjectColor = {
  /** Solid dot / accent. */
  dot: string;
  /** Event block background. */
  bg: string;
  /** Event block border. */
  border: string;
  /** Readable text on the block background. */
  text: string;
};

const PALETTE: ProjectColor[] = [
  { dot: "#b85c38", bg: "#f6e5db", border: "#e6c3ad", text: "#7c3a1f" }, // clay
  { dot: "#3e7c5a", bg: "#e0efe5", border: "#bcdcc7", text: "#285740" }, // green
  { dot: "#3b6ea5", bg: "#dfe9f4", border: "#bcd2ea", text: "#284e77" }, // blue
  { dot: "#8a5cb0", bg: "#ebe2f3", border: "#d4c2e6", text: "#5e3a82" }, // violet
  { dot: "#b8923a", bg: "#f5ebd4", border: "#e6d2a3", text: "#7c601f" }, // gold
  { dot: "#b23a5e", bg: "#f6e0e7", border: "#e9bccc", text: "#7c2641" }, // rose
  { dot: "#2f8f8f", bg: "#dcefef", border: "#b5dada", text: "#1f6464" }, // teal
  { dot: "#6b7a3a", bg: "#e8edd6", border: "#cdd6a8", text: "#4a561f" }, // olive
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function projectColor(id: string): ProjectColor {
  return PALETTE[hash(id) % PALETTE.length];
}
