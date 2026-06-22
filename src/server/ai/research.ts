import "server-only";

/**
 * Web research for the marketing agents — grounds work in real external context
 * (competitors, trends, news). Provider-agnostic but ships a Tavily client
 * (LLM-friendly, simple, free tier). Gated on SEARCH_API_KEY: with no key the
 * feature cleanly no-ops so the rest of the chat is unaffected.
 *
 *   SEARCH_API_KEY   Tavily API key (https://tavily.com)
 *   SEARCH_PROVIDER  "tavily" (default)
 */
const SEARCH_TIMEOUT_MS = 12000;

export function webResearchConfigured(): boolean {
  return !!process.env.SEARCH_API_KEY;
}

export type ResearchResult = {
  answer: string | null;
  sources: { title: string; url: string; snippet: string }[];
};

export async function searchWeb(
  query: string,
  maxResults = 5,
): Promise<ResearchResult | null> {
  const key = process.env.SEARCH_API_KEY;
  if (!key || !query.trim()) return null;

  // Only Tavily is wired today; the env var leaves room for others.
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      include_answer: true,
      search_depth: "basic",
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as {
    answer?: string;
    results?: { title: string; url: string; content: string }[];
  };
  return {
    answer: json.answer ?? null,
    sources: (json.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    })),
  };
}
