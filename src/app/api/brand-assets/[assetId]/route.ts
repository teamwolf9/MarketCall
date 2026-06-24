import { auth } from "@clerk/nextjs/server";
import { getBrandAssetBytes } from "@/server/brand-assets";

/** Serve an uploaded brand asset's bytes, gated by access to its brand. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { assetId } = await params;
  const asset = await getBrandAssetBytes(userId, assetId);
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
