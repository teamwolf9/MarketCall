"use client";

import { useRef, useState } from "react";
import { uploadAsset } from "@/server/brand-asset-actions";
import type { AssetMeta } from "@/server/brand-assets";

/** Downscale an image file to a ~1200px WebP data URL (kept self-contained). */
async function fileToDataUrl(file: File): Promise<string> {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (isSvg) {
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/webp", 0.9);
}

async function urlToDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export function ImagePicker({
  brandId,
  images,
  onInsert,
  onClose,
}: {
  brandId: string;
  images: AssetMeta[];
  onInsert: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pickLibrary(img: AssetMeta) {
    setBusy(true);
    try {
      onInsert(await urlToDataUrl(`/api/brand-assets/${img.id}`));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function uploadAndInsert(file: File) {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      onInsert(dataUrl);
      // Also add it to the brand library for reuse (best-effort; needs admin).
      const base64 = dataUrl.split(",")[1];
      const mimeType = dataUrl.match(/^data:(.*?);/)?.[1] ?? "image/webp";
      uploadAsset(brandId, {
        kind: "image",
        label: file.name,
        fileName: file.name,
        mimeType,
        base64,
      }).catch(() => {});
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">
            Insert image
          </h2>
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) uploadAndInsert(f);
            }}
          />
          <button
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="btn btn-outline"
          >
            {busy ? "Working…" : "Upload new"}
          </button>
        </div>

        <p className="mt-1 text-sm text-ink-soft">
          Pick from the brand image library, or upload a new one (it’s added to the
          library too).
        </p>

        <div className="mt-4 max-h-[55vh] overflow-y-auto">
          {images.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No images in the library yet. Upload one, or add images on the brand
              guide.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => pickLibrary(img)}
                  disabled={busy}
                  className="group overflow-hidden rounded-lg border border-line transition hover:border-accent disabled:opacity-50"
                  title={img.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/brand-assets/${img.id}`}
                    alt={img.label}
                    className="h-24 w-full bg-surface-2 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
