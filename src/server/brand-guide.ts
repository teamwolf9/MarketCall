import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { brandGuides, brands, projects, type Brand } from "@/server/db/schema";
import { brandRole, roleAtLeast } from "@/server/auth/access";
import {
  mergeGuide,
  toExportTokens,
  type BrandGuideData,
  type ExportTokens,
} from "@/lib/brand-guide";

/** The brand's design tokens, merged over defaults (never null). */
export async function getBrandGuide(brandId: string): Promise<BrandGuideData> {
  const row = await db.query.brandGuides.findFirst({
    where: eq(brandGuides.brandId, brandId),
  });
  return mergeGuide(row?.guide);
}

export type BrandGuideContext = {
  brand: Brand;
  guide: BrandGuideData;
  canEdit: boolean;
};

/** Guide + brand + edit permission, gated by the cascade access check. */
export async function getBrandGuideForUser(
  userId: string,
  brandId: string,
): Promise<BrandGuideContext | null> {
  const role = await brandRole(userId, brandId);
  if (!role) return null;
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) return null;
  return {
    brand,
    guide: await getBrandGuide(brandId),
    canEdit: roleAtLeast(role, "admin"),
  };
}

/** Resolve export tokens (colors/fonts/logo) for a project's parent brand. */
export async function exportTokensForProject(
  projectId: string,
): Promise<ExportTokens | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { brandId: true },
  });
  if (!project) return null;
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, project.brandId),
  });
  if (!brand) return null;
  const guide = await getBrandGuide(brand.id);
  return toExportTokens(guide, brand.name, brand.logoUrl);
}

/** Persist the guide. Admin+ on the brand. */
export async function saveBrandGuideForUser(
  userId: string,
  brandId: string,
  data: BrandGuideData,
): Promise<boolean> {
  if (!roleAtLeast(await brandRole(userId, brandId), "admin")) return false;
  await db
    .insert(brandGuides)
    .values({ brandId, guide: data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: brandGuides.brandId,
      set: { guide: data, updatedAt: new Date() },
    });
  return true;
}

/** Render the guide as a markdown block for AI prompts (only filled parts). */
export function formatBrandGuideForPrompt(guide: BrandGuideData): string {
  const lines: string[] = [];
  const palette = guide.colors.palette
    .filter((c) => c.hex)
    .map((c) => `${c.name || "color"} ${c.hex}`)
    .join(", ");
  lines.push(
    `- Colors: primary ${guide.colors.primary}, accent ${guide.colors.accent}, text ${guide.colors.ink}, background ${guide.colors.paper}${palette ? `; palette: ${palette}` : ""}`,
  );
  lines.push(`- Fonts: headings ${guide.fonts.heading}, body ${guide.fonts.body}`);
  if (guide.voice.trim()) lines.push(`- Voice & tone: ${guide.voice.trim()}`);
  if (guide.wordsUse.trim()) lines.push(`- Words to use: ${guide.wordsUse.trim()}`);
  if (guide.wordsAvoid.trim())
    lines.push(`- Words to avoid: ${guide.wordsAvoid.trim()}`);
  if (guide.imagery.trim()) lines.push(`- Imagery style: ${guide.imagery.trim()}`);
  if (guide.logoUsage.trim())
    lines.push(`- Logo usage: ${guide.logoUsage.trim()}`);
  return lines.join("\n");
}
