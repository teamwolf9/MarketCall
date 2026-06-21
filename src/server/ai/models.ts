import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Bring-your-own provider (load-bearing principle: the browser never talks to a
 * provider directly — the server holds the keys and resolves the model). Nothing
 * here is hardwired to a vendor: you point MarketCall at whatever endpoint, key,
 * and model you already use, via environment variables.
 *
 *   AI_PROVIDER   "openai-compatible" (default) | "anthropic"
 *   AI_BASE_URL   endpoint base URL — required for openai-compatible.
 *                 e.g. https://api.openai.com/v1, https://openrouter.ai/api/v1,
 *                 https://api.groq.com/openai/v1, http://localhost:11434/v1 (Ollama)
 *   AI_API_KEY    key for that endpoint (falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY)
 *   AI_MODEL      model id the endpoint serves — e.g. gpt-4o-mini, claude-sonnet-4-6,
 *                 llama-3.1-70b, etc.
 *   AI_MODEL_FAST / AI_MODEL_SMART   optional cheaper/stronger ids (default to AI_MODEL)
 *
 * "openai-compatible" covers the vast majority of providers (OpenAI, OpenRouter,
 * Together, Groq, Azure, vLLM, Ollama, LM Studio…) since they share one API.
 * Logical keys (default/fast/smart) keep call sites vendor-agnostic and let the
 * orchestrator route by capability without knowing which provider is behind it.
 */
export type ModelKey = "default" | "fast" | "smart";

type ProviderConfig = {
  provider: "openai-compatible" | "anthropic";
  baseURL?: string;
  apiKey: string;
  models: Record<ModelKey, string>;
};

function readConfig(): ProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? "openai-compatible") as
    | "openai-compatible"
    | "anthropic";
  const apiKey =
    process.env.AI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.OPENAI_API_KEY ??
    "";
  const model = process.env.AI_MODEL ?? "";
  const baseURL = process.env.AI_BASE_URL || undefined;

  // Need a key and a model; openai-compatible additionally needs an endpoint.
  if (!apiKey || !model) return null;
  if (provider === "openai-compatible" && !baseURL) return null;

  return {
    provider,
    baseURL,
    apiKey,
    models: {
      default: model,
      fast: process.env.AI_MODEL_FAST || model,
      smart: process.env.AI_MODEL_SMART || model,
    },
  };
}

/** True once the user has supplied a working provider config in the environment. */
export function aiConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * Construct a LanguageModel from raw provider settings. Shared by the env-based
 * fallback (here) and the per-org DB providers (src/server/ai/providers.ts), so
 * the construction logic lives in exactly one place.
 */
export function buildModel(
  provider: "openai-compatible" | "anthropic",
  baseURL: string | null | undefined,
  apiKey: string,
  modelId: string,
): LanguageModel {
  if (provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return anthropic(modelId);
  }
  if (!baseURL) {
    throw new Error("An openai-compatible provider requires a base URL.");
  }
  const openaiCompatible = createOpenAICompatible({
    name: "byo",
    baseURL,
    apiKey,
  });
  return openaiCompatible(modelId);
}

export function resolveModel(key: ModelKey): LanguageModel {
  const cfg = readConfig();
  if (!cfg) {
    throw new Error(
      "AI provider not configured. Set AI_API_KEY and AI_MODEL (plus AI_BASE_URL for openai-compatible) in .env.local.",
    );
  }
  return buildModel(cfg.provider, cfg.baseURL, cfg.apiKey, cfg.models[key]);
}

/** The concrete model id behind a logical key — shown in the UI next to a turn. */
export function modelLabel(key: ModelKey): string {
  const cfg = readConfig();
  return cfg ? cfg.models[key] : key;
}
