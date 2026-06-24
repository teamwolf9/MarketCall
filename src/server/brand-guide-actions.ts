"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { saveBrandGuideForUser } from "@/server/brand-guide";
import { mergeGuide, type BrandGuideData } from "@/lib/brand-guide";

/** Save a brand's design system. Admin+ on the brand. Returns success. */
export async function saveBrandGuide(
  brandId: string,
  data: BrandGuideData,
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId || !brandId) return false;
  // Re-merge to guarantee a well-formed, complete object lands in the DB.
  const ok = await saveBrandGuideForUser(userId, brandId, mergeGuide(data));
  if (ok) {
    revalidatePath(`/brands/${brandId}/guide`);
    revalidatePath(`/brands/${brandId}`);
  }
  return ok;
}
