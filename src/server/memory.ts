import "server-only";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { memories, deliverables, projects } from "@/server/db/schema";
import { projectRole, roleAtLeast } from "@/server/auth/access";
import {
  embedQuery,
  embedTexts,
  embeddingsConfigured,
} from "@/server/ai/embeddings";

/**
 * Brand memory: index deliverables as embeddings and retrieve the nearest ones
 * for a chat turn. Indexing is best-effort — it never throws into the save path,
 * because a deliverable saving successfully must not depend on the embedding
 * provider being up. Retrieval likewise degrades to "no memory" on any failure.
 */

// Cap what we embed per deliverable; embeddings models have token limits and the
// first few thousand characters carry the voice/intent we care about.
const MAX_CHARS = 8000;
// Drop weak matches so we don't pad the prompt with irrelevant past work.
const MIN_SIMILARITY = 0.3;

type IndexableDeliverable = {
  id: string;
  projectId: string;
  title: string;
  content: string;
};

async function brandIdForProject(projectId: string): Promise<string | null> {
  const p = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { brandId: true },
  });
  return p?.brandId ?? null;
}

/** What we embed for a deliverable — title carries a lot of the intent. */
function memoryText(d: IndexableDeliverable): string {
  return `${d.title}\n\n${d.content}`.slice(0, MAX_CHARS);
}

/** Upsert one deliverable's memory row from a precomputed embedding. */
async function upsertMemory(
  brandId: string,
  d: IndexableDeliverable,
  text: string,
  embedding: number[],
): Promise<void> {
  const existing = await db.query.memories.findFirst({
    where: and(eq(memories.kind, "deliverable"), eq(memories.sourceId, d.id)),
    columns: { id: true },
  });
  if (existing) {
    await db
      .update(memories)
      .set({
        brandId,
        projectId: d.projectId,
        title: d.title,
        content: text,
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, existing.id));
  } else {
    await db.insert(memories).values({
      brandId,
      projectId: d.projectId,
      kind: "deliverable",
      sourceId: d.id,
      title: d.title,
      content: text,
      embedding,
    });
  }
}

/** Upsert a deliverable's memory row (keyed by source). Best-effort, never throws. */
export async function indexDeliverable(d: IndexableDeliverable): Promise<void> {
  if (!embeddingsConfigured()) return;
  try {
    const brandId = await brandIdForProject(d.projectId);
    if (!brandId) return;
    const text = memoryText(d);
    const [embedding] = (await embedTexts([text])) ?? [];
    if (!embedding) return;
    await upsertMemory(brandId, d, text, embedding);
  } catch (err) {
    console.error("indexDeliverable failed:", err);
  }
}

/** Remove a deliverable's memory row. Best-effort. */
export async function removeDeliverableMemory(deliverableId: string): Promise<void> {
  try {
    await db
      .delete(memories)
      .where(
        and(
          eq(memories.kind, "deliverable"),
          eq(memories.sourceId, deliverableId),
        ),
      );
  } catch (err) {
    console.error("removeDeliverableMemory failed:", err);
  }
}

export type MemoryHit = {
  title: string;
  content: string;
  projectId: string | null;
  similarity: number;
};

/** Nearest brand memories to a query (cosine). Returns [] if memory is off/empty. */
export async function searchBrandMemory(
  brandId: string,
  query: string,
  k = 4,
): Promise<MemoryHit[]> {
  if (!embeddingsConfigured()) return [];
  try {
    const vec = await embedQuery(query);
    if (!vec) return [];
    const similarity = sql<number>`1 - (${cosineDistance(memories.embedding, vec)})`;
    const rows = await db
      .select({
        title: memories.title,
        content: memories.content,
        projectId: memories.projectId,
        similarity,
      })
      .from(memories)
      .where(eq(memories.brandId, brandId))
      .orderBy(desc(similarity))
      .limit(k);
    return rows.filter((r) => r.similarity >= MIN_SIMILARITY);
  } catch (err) {
    console.error("searchBrandMemory failed:", err);
    return [];
  }
}

/** Re-embed every deliverable in a project. Editor+. Returns how many were indexed. */
export async function reindexProjectMemories(
  userId: string,
  projectId: string,
): Promise<number> {
  if (!roleAtLeast(await projectRole(userId, projectId), "editor")) return 0;
  if (!embeddingsConfigured()) return 0;
  const rows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.projectId, projectId));
  if (rows.length === 0) return 0;

  const brandId = await brandIdForProject(projectId);
  if (!brandId) return 0;

  // One batched embedding call for the whole project, then upsert each row,
  // instead of an embedding round-trip per deliverable.
  const texts = rows.map(memoryText);
  const vectors = await embedTexts(texts);
  if (!vectors || vectors.length !== rows.length) return 0;

  let indexed = 0;
  for (let i = 0; i < rows.length; i++) {
    try {
      await upsertMemory(brandId, rows[i], texts[i], vectors[i]);
      indexed++;
    } catch (err) {
      console.error("reindex upsert failed:", err);
    }
  }
  return indexed;
}
