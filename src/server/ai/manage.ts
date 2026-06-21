"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { aiProviders, type AiProviderType } from "@/server/db/schema";
import { ensureOrgForUser } from "@/server/orgs";
import { encryptSecret } from "@/server/crypto";
import { testProviderConfig } from "@/server/ai/providers";

const PROVIDER_TYPES: AiProviderType[] = ["openai-compatible", "anthropic"];

export type AddProviderState = { ok?: boolean; error?: string };

/**
 * Add a provider profile. We live-test the config first and only persist it if
 * the test passes, so a saved provider is always a working one. The key is
 * encrypted before it touches the database.
 */
export async function addProvider(
  _prev: AddProviderState,
  formData: FormData,
): Promise<AddProviderState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not signed in." };
  const orgId = await ensureOrgForUser(userId);

  const name = String(formData.get("name") ?? "").trim();
  const providerType = String(formData.get("providerType") ?? "") as AiProviderType;
  const baseUrl = String(formData.get("baseUrl") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim();
  const modelFast = String(formData.get("modelFast") ?? "").trim() || null;
  const modelSmart = String(formData.get("modelSmart") ?? "").trim() || null;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!name || !model || !apiKey) {
    return { error: "Name, model, and API key are required." };
  }
  if (!PROVIDER_TYPES.includes(providerType)) {
    return { error: "Choose a provider type." };
  }
  if (providerType === "openai-compatible" && !baseUrl) {
    return { error: "Base URL is required for an openai-compatible provider." };
  }

  const test = await testProviderConfig({ providerType, baseUrl, apiKey, model });
  if (!test.ok) {
    return { error: `Connection test failed — ${test.error}` };
  }

  // The first provider for an org becomes its active one automatically.
  const existing = await db
    .select({ id: aiProviders.id })
    .from(aiProviders)
    .where(eq(aiProviders.orgId, orgId));

  await db.insert(aiProviders).values({
    orgId,
    name,
    providerType,
    baseUrl,
    model,
    modelFast,
    modelSmart,
    apiKeyCipher: encryptSecret(apiKey),
    isActive: existing.length === 0,
  });

  revalidatePath("/ai");
  return { ok: true };
}

/** Make one provider the org's active one; deactivate the rest. */
export async function setActiveProvider(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const orgId = await ensureOrgForUser(userId);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const owned = await db.query.aiProviders.findFirst({
    where: and(eq(aiProviders.id, id), eq(aiProviders.orgId, orgId)),
    columns: { id: true },
  });
  if (!owned) return;

  await db
    .update(aiProviders)
    .set({ isActive: false })
    .where(eq(aiProviders.orgId, orgId));
  await db
    .update(aiProviders)
    .set({ isActive: true })
    .where(and(eq(aiProviders.id, id), eq(aiProviders.orgId, orgId)));
  revalidatePath("/ai");
}

/** Delete a provider. If it was active, the org falls back to the .env provider. */
export async function deleteProvider(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const orgId = await ensureOrgForUser(userId);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(aiProviders)
    .where(and(eq(aiProviders.id, id), eq(aiProviders.orgId, orgId)));
  revalidatePath("/ai");
}
