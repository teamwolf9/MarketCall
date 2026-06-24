"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  addBrandAsset,
  setLogoVariant,
  deleteBrandAsset,
  type AssetInput,
} from "@/server/brand-assets";

type Result = { ok: boolean; error?: string };

/** Upload/replace a logo slot (icon handled separately via the icon uploader). */
export async function uploadLogoVariant(
  brandId: string,
  variant: string,
  input: Omit<AssetInput, "kind" | "variant" | "fontFamily">,
): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await setLogoVariant(userId, brandId, variant, input);
  if (res.ok) revalidatePath(`/brands/${brandId}/guide`);
  return res;
}

/** Upload a font / document / image into the brand's asset library. */
export async function uploadAsset(
  brandId: string,
  input: AssetInput,
): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await addBrandAsset(userId, brandId, input);
  if (res.ok) revalidatePath(`/brands/${brandId}/guide`);
  return res;
}

export async function removeAsset(
  brandId: string,
  assetId: string,
): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in." };
  const ok = await deleteBrandAsset(userId, assetId);
  if (ok) revalidatePath(`/brands/${brandId}/guide`);
  return { ok };
}
