import { auth } from "@clerk/nextjs/server";
import { refineDeliverable } from "@/server/ai/refine";

// Two model passes (critique + rewrite) — give it room.
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { deliverableId } = await params;
  const result = await refineDeliverable(userId, deliverableId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ markdown: result.markdown });
}
