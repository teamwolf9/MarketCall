import "server-only";

/**
 * Embeddings for brand memory / RAG. We call the provider's OpenAI-compatible
 * /embeddings endpoint directly (rather than through the AI SDK) so we can pin
 * the output dimensionality — gemini-embedding-001 is natively 3072-dim, but we
 * request 768 (Matryoshka truncation) to match the pgvector column and stay
 * under pgvector's ANN index cap. Any OpenAI-compatible embeddings endpoint
 * works; set AI_EMBED_MODEL to turn the feature on.
 *
 *   AI_BASE_URL    reused from the chat provider (e.g. Gemini's /openai/ base)
 *   AI_API_KEY     reused from the chat provider
 *   AI_EMBED_MODEL e.g. gemini-embedding-001, text-embedding-3-small
 */

/** Must match the `vector("embedding", { dimensions })` column in the schema. */
export const EMBEDDING_DIMENSIONS = 768;

// Cap how long we'll wait on the embeddings endpoint. This call sits on the
// chat hot path (RAG retrieval) and the deliverable-save path, so a hung
// provider must not hang the request — on timeout we degrade to "no memory".
const EMBED_TIMEOUT_MS = 6000;

function config(): { baseURL: string; apiKey: string; model: string } | null {
  const baseURL = process.env.AI_BASE_URL?.replace(/\/+$/, "");
  const apiKey =
    process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  const model = process.env.AI_EMBED_MODEL ?? "";
  if (!baseURL || !apiKey || !model) return null;
  return { baseURL, apiKey, model };
}

/** True once an embedding model is configured — gates all memory features. */
export function embeddingsConfigured(): boolean {
  return config() !== null;
}

/** Embed a batch of texts. Returns vectors in input order, or null if off. */
export async function embedTexts(inputs: string[]): Promise<number[][] | null> {
  const c = config();
  if (!c || inputs.length === 0) return null;

  let res: Response;
  try {
    res = await fetch(`${c.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.apiKey}`,
      },
      body: JSON.stringify({
        model: c.model,
        input: inputs,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
  } catch (err) {
    // Timeout/network — surface as a normal failure so callers degrade gracefully.
    throw new Error(
      `Embedding request failed: ${err instanceof Error ? err.message : "network error"}`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Embedding request failed: ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed a single query string. Returns the vector, or null if off/empty. */
export async function embedQuery(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const out = await embedTexts([trimmed]);
  return out?.[0] ?? null;
}
