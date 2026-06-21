import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { generateText, type LanguageModel } from "ai";
import { db } from "@/server/db";
import { aiProviders, type AiProvider, type AiProviderType } from "@/server/db/schema";
import { decryptSecret } from "@/server/crypto";
import {
  aiConfigured,
  buildModel,
  modelLabel as envModelLabel,
  resolveModel as envResolveModel,
  type ModelKey,
} from "@/server/ai/models";

/**
 * Per-org AI providers (DB-backed). The chat resolves the model from the active
 * provider of the *project's parent org*; if that org has none configured, it
 * falls back to the .env provider — so the existing single-key setup keeps
 * working while orgs can bring their own.
 */

export async function listProviders(orgId: string): Promise<AiProvider[]> {
  return db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.orgId, orgId))
    .orderBy(asc(aiProviders.createdAt));
}

export async function getActiveProvider(orgId: string): Promise<AiProvider | null> {
  const row = await db.query.aiProviders.findFirst({
    where: and(eq(aiProviders.orgId, orgId), eq(aiProviders.isActive, true)),
  });
  return row ?? null;
}

function modelIdFor(p: AiProvider, key: ModelKey): string {
  if (key === "fast") return p.modelFast || p.model;
  if (key === "smart") return p.modelSmart || p.model;
  return p.model;
}

/** Build a LanguageModel for an org + logical key, decrypting the stored key. */
export async function resolveModelForOrg(
  orgId: string,
  key: ModelKey,
): Promise<LanguageModel> {
  const active = await getActiveProvider(orgId);
  if (active) {
    const apiKey = decryptSecret(active.apiKeyCipher);
    return buildModel(active.providerType, active.baseUrl, apiKey, modelIdFor(active, key));
  }
  // Fall back to the .env provider.
  return envResolveModel(key);
}

/** Is *some* provider available for this org — its own active one, or the env one? */
export async function aiConfiguredForOrg(orgId: string): Promise<boolean> {
  if (await getActiveProvider(orgId)) return true;
  return aiConfigured();
}

/** The concrete model id that will be used for a key (for display). */
export async function modelLabelForOrg(
  orgId: string,
  key: ModelKey,
): Promise<string> {
  const active = await getActiveProvider(orgId);
  if (active) return modelIdFor(active, key);
  return envModelLabel(key);
}

export type TestResult = { ok: boolean; sample?: string; error?: string };

/** Live-ping a provider config (used before saving and from the dashboard). */
export async function testProviderConfig(input: {
  providerType: AiProviderType;
  baseUrl?: string | null;
  apiKey: string;
  model: string;
}): Promise<TestResult> {
  try {
    const model = buildModel(
      input.providerType,
      input.baseUrl,
      input.apiKey,
      input.model,
    );
    const { text } = await generateText({
      model,
      prompt: "Reply with exactly: pong",
    });
    return { ok: true, sample: text.trim().slice(0, 60) };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number };
    return {
      ok: false,
      error: err.statusCode
        ? `${err.statusCode}: ${err.message ?? "request failed"}`
        : (err.message ?? "Connection failed"),
    };
  }
}
