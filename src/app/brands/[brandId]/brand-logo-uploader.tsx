"use client";

import { useRef, useState, useTransition } from "react";
import { setBrandLogo, removeBrandLogo } from "@/server/actions";
import { BrandLogo } from "@/app/_components/brand-logo";

const MAX_DIM = 128; // downscale longest edge to this; keeps the data URL tiny

/** Read an image file, downscale it on a canvas, return a compact data URL. */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  // WebP where supported (smaller); browsers without it fall back to PNG —
  // both are accepted server-side.
  return canvas.toDataURL("image/webp", 0.85);
}

export function BrandLogoUploader({
  brandId,
  name,
  logoUrl,
}: {
  brandId: string;
  name: string;
  logoUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    try {
      const dataUrl = await downscale(file);
      if (dataUrl.length > 256 * 1024) {
        setError("That image is too large even after resizing.");
        return;
      }
      setPreview(dataUrl);
      const fd = new FormData();
      fd.set("brandId", brandId);
      fd.set("logo", dataUrl);
      startTransition(() => setBrandLogo(fd));
    } catch {
      setError("Couldn't process that image.");
    }
  }

  function onRemove() {
    setPreview(null);
    const fd = new FormData();
    fd.set("brandId", brandId);
    startTransition(() => removeBrandLogo(fd));
  }

  return (
    <div className="flex items-center gap-4">
      <BrandLogo name={name} logoUrl={preview} size={56} />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="btn btn-outline"
          >
            {pending ? "Saving…" : preview ? "Change logo" : "Upload logo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="btn btn-ghost"
            >
              Remove
            </button>
          )}
        </div>
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : (
          <span className="text-xs text-muted">
            PNG, JPG, or WebP. Shown in front of the brand name.
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}
