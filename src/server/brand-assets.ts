import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { brandAssets, type BrandAssetKind } from "@/server/db/schema";
import { brandRole, roleAtLeast } from "@/server/auth/access";

/** ~2 MB per file (no external storage yet). */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

/** Metadata only — never ships the base64 bytes to a list view. */
export type AssetMeta = {
  id: string;
  kind: BrandAssetKind;
  variant: string | null;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fontFamily?: string;
};

const META_COLUMNS = {
  id: brandAssets.id,
  kind: brandAssets.kind,
  variant: brandAssets.variant,
  label: brandAssets.label,
  fileName: brandAssets.fileName,
  mimeType: brandAssets.mimeType,
  sizeBytes: brandAssets.sizeBytes,
  meta: brandAssets.meta,
};

function toMeta(r: {
  id: string;
  kind: BrandAssetKind;
  variant: string | null;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  meta: { fontFamily?: string } | null;
}): AssetMeta {
  return {
    id: r.id,
    kind: r.kind,
    variant: r.variant,
    label: r.label,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    fontFamily: r.meta?.fontFamily,
  };
}

export async function listBrandAssets(brandId: string): Promise<AssetMeta[]> {
  const rows = await db
    .select(META_COLUMNS)
    .from(brandAssets)
    .where(eq(brandAssets.brandId, brandId))
    .orderBy(asc(brandAssets.createdAt));
  return rows.map(toMeta);
}

/** The raw bytes of one asset, gated by any access to its brand. */
export async function getBrandAssetBytes(
  userId: string,
  assetId: string,
): Promise<{ mimeType: string; fileName: string; buffer: Buffer } | null> {
  const asset = await db.query.brandAssets.findFirst({
    where: eq(brandAssets.id, assetId),
  });
  if (!asset) return null;
  if (!(await brandRole(userId, asset.brandId))) return null;
  return {
    mimeType: asset.mimeType,
    fileName: asset.fileName,
    buffer: Buffer.from(asset.data, "base64"),
  };
}

export type AssetInput = {
  kind: BrandAssetKind;
  variant?: string | null;
  label: string;
  fileName: string;
  mimeType: string;
  base64: string;
  fontFamily?: string;
};

function validate(input: AssetInput): string | null {
  if (!input.base64) return "Empty file.";
  const bytes = Math.floor((input.base64.length * 3) / 4);
  if (bytes > MAX_ASSET_BYTES) return "File is too large (max 2 MB).";
  const ext = input.fileName.toLowerCase().split(".").pop() ?? "";
  if (input.kind === "logo" || input.kind === "image") {
    if (!["png", "jpg", "jpeg", "webp", "svg"].includes(ext))
      return "Use a PNG, JPG, WebP, or SVG image.";
  } else if (input.kind === "font") {
    if (!["woff2", "woff", "ttf", "otf"].includes(ext))
      return "Use a WOFF2, WOFF, TTF, or OTF font file.";
  } else if (input.kind === "document") {
    if (!["pdf"].includes(ext)) return "Use a PDF document.";
  }
  return null;
}

async function canManage(userId: string, brandId: string) {
  return roleAtLeast(await brandRole(userId, brandId), "admin");
}

/** Add a font/document/image asset (many allowed). Admin+. Returns ok+error. */
export async function addBrandAsset(
  userId: string,
  brandId: string,
  input: AssetInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await canManage(userId, brandId))) return { ok: false, error: "Not allowed." };
  const err = validate(input);
  if (err) return { ok: false, error: err };
  await db.insert(brandAssets).values({
    brandId,
    kind: input.kind,
    variant: input.variant ?? null,
    label: input.label || input.fileName,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: Math.floor((input.base64.length * 3) / 4),
    data: input.base64,
    meta: input.fontFamily ? { fontFamily: input.fontFamily } : null,
  });
  return { ok: true };
}

/** Set a single logo slot (icon/horizontal/vertical/reversed). Replaces it. Admin+. */
export async function setLogoVariant(
  userId: string,
  brandId: string,
  variant: string,
  input: Omit<AssetInput, "kind" | "variant" | "fontFamily">,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await canManage(userId, brandId))) return { ok: false, error: "Not allowed." };
  const err = validate({ ...input, kind: "logo" });
  if (err) return { ok: false, error: err };
  await db
    .delete(brandAssets)
    .where(
      and(
        eq(brandAssets.brandId, brandId),
        eq(brandAssets.kind, "logo"),
        eq(brandAssets.variant, variant),
      ),
    );
  await db.insert(brandAssets).values({
    brandId,
    kind: "logo",
    variant,
    label: input.label || variant,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: Math.floor((input.base64.length * 3) / 4),
    data: input.base64,
  });
  return { ok: true };
}

export async function deleteBrandAsset(
  userId: string,
  assetId: string,
): Promise<boolean> {
  const asset = await db.query.brandAssets.findFirst({
    where: eq(brandAssets.id, assetId),
    columns: { id: true, brandId: true },
  });
  if (!asset) return false;
  if (!(await canManage(userId, asset.brandId))) return false;
  await db.delete(brandAssets).where(eq(brandAssets.id, assetId));
  return true;
}
