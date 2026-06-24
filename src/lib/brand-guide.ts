/**
 * The brand design system — per-brand tokens that drive both AI generation and
 * asset exports (decks, PDFs, docs). Client-safe (no server imports) so the
 * editor, the export buttons, and the server all read one shape.
 *
 * Defaults intentionally match the app's "Clay" look and the values the export
 * code used to hardcode, so a brand with no saved guide exports exactly as
 * before — the guide only ever overrides.
 */
export type BrandColor = { name: string; hex: string };

export type BrandGuideData = {
  colors: {
    primary: string; // headline brand color
    accent: string; // lines, links, highlights
    ink: string; // body text
    paper: string; // page/slide background
    palette: BrandColor[]; // extra named brand colors
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUsage: string;
  voice: string;
  wordsUse: string;
  wordsAvoid: string;
  imagery: string;
};

export const DEFAULT_BRAND_GUIDE: BrandGuideData = {
  colors: {
    primary: "#C96442",
    accent: "#C96442",
    ink: "#201D18",
    paper: "#FAF9F5",
    palette: [],
  },
  fonts: { heading: "Georgia", body: "Georgia" },
  logoUsage: "",
  voice: "",
  wordsUse: "",
  wordsAvoid: "",
  imagery: "",
};

/** Fonts safe to use in Office/PDF exports (present on most systems). */
export const EXPORT_FONTS = [
  "Georgia",
  "Times New Roman",
  "Garamond",
  "Arial",
  "Helvetica",
  "Calibri",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
];

/** Merge a possibly-partial saved guide over the defaults. */
export function mergeGuide(saved: Partial<BrandGuideData> | null | undefined): BrandGuideData {
  const s = saved ?? {};
  return {
    colors: { ...DEFAULT_BRAND_GUIDE.colors, ...(s.colors ?? {}),
      palette: Array.isArray(s.colors?.palette) ? s.colors!.palette : [] },
    fonts: { ...DEFAULT_BRAND_GUIDE.fonts, ...(s.fonts ?? {}) },
    logoUsage: s.logoUsage ?? "",
    voice: s.voice ?? "",
    wordsUse: s.wordsUse ?? "",
    wordsAvoid: s.wordsAvoid ?? "",
    imagery: s.imagery ?? "",
  };
}

/** Strip a leading # for libraries (pptxgenjs) that want bare hex. */
export function hex6(h: string): string {
  const v = (h || "").replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : "000000";
}

/** Tokens an asset export needs — colors with #, font names, brand identity. */
export type ExportTokens = {
  brandName?: string;
  logoUrl?: string | null;
  accent: string;
  ink: string;
  paper: string;
  heading: string;
  body: string;
};

export function toExportTokens(
  guide: BrandGuideData,
  brandName?: string,
  logoUrl?: string | null,
): ExportTokens {
  return {
    brandName,
    logoUrl: logoUrl ?? null,
    accent: guide.colors.accent,
    ink: guide.colors.ink,
    paper: guide.colors.paper,
    heading: guide.fonts.heading,
    body: guide.fonts.body,
  };
}

/** Names of the brand's uploaded assets, for the Markdown export. */
export type AssetSummary = {
  logos: string[];
  fonts: string[];
  documents: string[];
};

/**
 * Serialize the brand guide to a clean Markdown document — portable enough to
 * paste into another AI agent as the brand's source of truth.
 */
export function brandGuideToMarkdown(
  brandName: string,
  g: BrandGuideData,
  assets?: AssetSummary,
): string {
  const out: string[] = [];
  const section = (s: string) => out.push("", `## ${s}`);
  const fallback = (s: string) => (s.trim() ? s.trim() : "_Not set._");

  out.push(`# ${brandName} — Brand Guide`);
  out.push("");
  out.push(
    `> The design system for **${brandName}**. Treat this as the source of truth when creating any asset, copy, or layout for this brand — match the colors, fonts, voice, and rules below.`,
  );

  section("Colors");
  out.push(`- **Primary:** \`${g.colors.primary}\``);
  out.push(`- **Accent:** \`${g.colors.accent}\``);
  out.push(`- **Text:** \`${g.colors.ink}\``);
  out.push(`- **Background:** \`${g.colors.paper}\``);
  const palette = g.colors.palette.filter((c) => c.hex);
  if (palette.length) {
    out.push("", "**Palette:**");
    for (const c of palette) out.push(`- ${c.name || "Color"}: \`${c.hex}\``);
  }

  section("Typography");
  out.push(`- **Headings:** ${g.fonts.heading}`);
  out.push(`- **Body:** ${g.fonts.body}`);
  if (assets?.fonts.length)
    out.push(`- **Brand font files:** ${assets.fonts.join(", ")}`);

  section("Logo");
  out.push(
    assets?.logos.length
      ? `- **Available versions:** ${assets.logos.join(", ")}`
      : "- _No logo files uploaded yet._",
  );
  if (g.logoUsage.trim()) {
    out.push("", "**Usage notes:**", g.logoUsage.trim());
  }

  section("Voice & tone");
  out.push(fallback(g.voice));
  if (g.wordsUse.trim()) out.push("", `**Words to use:** ${g.wordsUse.trim()}`);
  if (g.wordsAvoid.trim())
    out.push("", `**Words to avoid:** ${g.wordsAvoid.trim()}`);

  section("Imagery");
  out.push(fallback(g.imagery));

  if (assets?.documents.length) {
    section("Brand documents");
    for (const d of assets.documents) out.push(`- ${d}`);
  }

  out.push("");
  return out.join("\n");
}
