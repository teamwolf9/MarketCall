"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogoUploader } from "../brand-logo-uploader";
import {
  uploadLogoVariant,
  uploadAsset,
  removeAsset,
} from "@/server/brand-asset-actions";
import type { AssetMeta } from "@/server/brand-assets";

/** Read a file to { base64, mimeType }. Raster images are downscaled to ~900px. */
async function readUpload(
  file: File,
  downscale: boolean,
): Promise<{ base64: string; mimeType: string; fileName: string }> {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (downscale && file.type.startsWith("image/") && !isSvg) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/webp", 0.92);
    return { base64: dataUrl.split(",")[1], mimeType: "image/webp", fileName: file.name };
  }
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const mimeType = dataUrl.match(/^data:(.*?);/)?.[1] || file.type || "application/octet-stream";
  return { base64: dataUrl.split(",")[1], mimeType, fileName: file.name };
}

function bytes(n: number): string {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const LOGO_SLOTS = [
  { variant: "horizontal", label: "Horizontal logo", hint: "Wordmark + icon, side by side", dark: false },
  { variant: "vertical", label: "Vertical logo", hint: "Stacked, for square spaces", dark: false },
  { variant: "reversed", label: "Reversed (on dark)", hint: "Light version for dark backgrounds", dark: true },
];

export function AssetManager({
  brandId,
  brandName,
  logoUrl,
  canEdit,
  assets,
}: {
  brandId: string;
  brandName: string;
  logoUrl: string | null;
  canEdit: boolean;
  assets: AssetMeta[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const logoFor = (variant: string) =>
    assets.find((a) => a.kind === "logo" && a.variant === variant) ?? null;
  const fonts = assets.filter((a) => a.kind === "font");
  const docs = assets.filter((a) => a.kind === "document");
  const images = assets.filter((a) => a.kind === "image");

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) setError(res.error || "Upload failed.");
      else router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function pickLogo(variant: string, file: File) {
    const u = await readUpload(file, true);
    await run(`logo-${variant}`, () =>
      uploadLogoVariant(brandId, variant, { label: variant, ...u }),
    );
  }
  async function pickFont(file: File, family: string) {
    const u = await readUpload(file, false);
    await run("font", () =>
      uploadAsset(brandId, { kind: "font", label: family, fontFamily: family, ...u }),
    );
  }
  async function pickDoc(file: File) {
    const u = await readUpload(file, false);
    await run("doc", () => uploadAsset(brandId, { kind: "document", label: file.name, ...u }));
  }
  async function pickImage(file: File) {
    const u = await readUpload(file, true);
    await run("image", () => uploadAsset(brandId, { kind: "image", label: file.name, ...u }));
  }
  async function del(id: string) {
    await run(`del-${id}`, () => removeAsset(brandId, id));
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Icon */}
      <div>
        <div className="text-sm font-medium text-ink">Icon</div>
        <p className="mb-2 text-xs text-muted">
          The small mark — used in the app nav and in front of the brand name.
        </p>
        <BrandLogoUploader brandId={brandId} name={brandName} logoUrl={logoUrl} />
      </div>

      {/* Full logo slots */}
      <div>
        <div className="text-sm font-medium text-ink">Full logos</div>
        <p className="mb-3 text-xs text-muted">
          PNG, JPG, WebP, or SVG. Stored at full quality for decks and documents.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {LOGO_SLOTS.map((slot) => {
            const asset = logoFor(slot.variant);
            return (
              <LogoSlot
                key={slot.variant}
                slot={slot}
                asset={asset}
                canEdit={canEdit}
                busy={busy === `logo-${slot.variant}` || (asset ? busy === `del-${asset.id}` : false)}
                onPick={(f) => pickLogo(slot.variant, f)}
                onRemove={asset ? () => del(asset.id) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Images */}
      <div>
        <div className="text-sm font-medium text-ink">Image library</div>
        <p className="mb-3 text-xs text-muted">
          Photos, graphics, and patterns to drop into deliverables you create.
        </p>
        {images.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/brand-assets/${img.id}`}
                  alt={img.label}
                  className="h-24 w-full bg-surface-2 object-cover"
                />
                {canEdit && (
                  <button
                    onClick={() => del(img.id)}
                    disabled={busy === `del-${img.id}`}
                    className="absolute right-1 top-1 rounded-md bg-ink/60 px-1.5 text-xs text-paper opacity-0 transition group-hover:opacity-100"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <FilePick
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            busy={busy === "image"}
            onPick={pickImage}
            label="Upload image"
          />
        )}
      </div>

      {/* Fonts */}
      <div>
        <div className="text-sm font-medium text-ink">Brand fonts</div>
        <p className="mb-3 text-xs text-muted">
          Upload WOFF2, WOFF, TTF, or OTF files. Named fonts become selectable in
          Typography.
        </p>
        {fonts.length > 0 && (
          <ul className="mb-3 divide-y divide-line rounded-lg border border-line">
            {fonts.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-ink" style={{ fontFamily: f.fontFamily }}>
                    {f.fontFamily || f.label}
                  </span>
                  <span className="ml-2 text-xs text-muted">
                    {f.fileName} · {bytes(f.sizeBytes)}
                  </span>
                </span>
                {canEdit && (
                  <button
                    onClick={() => del(f.id)}
                    disabled={busy === `del-${f.id}`}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && <FontUpload onUpload={pickFont} busy={busy === "font"} />}
      </div>

      {/* Documents */}
      <div>
        <div className="text-sm font-medium text-ink">Brand documents</div>
        <p className="mb-3 text-xs text-muted">
          PDFs — a brand book, guidelines, anything worth keeping with the brand.
        </p>
        {docs.length > 0 && (
          <ul className="mb-3 divide-y divide-line rounded-lg border border-line">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <a
                  href={`/api/brand-assets/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-ink hover:text-accent"
                >
                  {d.label}
                  <span className="ml-2 text-xs text-muted">{bytes(d.sizeBytes)}</span>
                </a>
                {canEdit && (
                  <button
                    onClick={() => del(d.id)}
                    disabled={busy === `del-${d.id}`}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <FilePick accept="application/pdf,.pdf" busy={busy === "doc"} onPick={pickDoc} label="Upload PDF" />
        )}
      </div>
    </div>
  );
}

function LogoSlot({
  slot,
  asset,
  canEdit,
  busy,
  onPick,
  onRemove,
}: {
  slot: { variant: string; label: string; hint: string; dark: boolean };
  asset: AssetMeta | null;
  canEdit: boolean;
  busy: boolean;
  onPick: (f: File) => void;
  onRemove?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="card overflow-hidden">
      <div
        className="flex h-28 items-center justify-center p-3"
        style={{ background: slot.dark ? "#201D18" : "var(--color-surface-2)" }}
      >
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/brand-assets/${asset.id}`}
            alt={slot.label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className={`text-xs ${slot.dark ? "text-neutral-400" : "text-muted"}`}>
            {busy ? "Uploading…" : "No logo yet"}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink">{slot.label}</div>
          <div className="truncate text-xs text-muted">{slot.hint}</div>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={ref}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onPick(f);
              }}
            />
            <button
              onClick={() => ref.current?.click()}
              disabled={busy}
              className="text-xs text-accent hover:text-accent-hover disabled:opacity-50"
            >
              {asset ? "Replace" : "Upload"}
            </button>
            {asset && onRemove && (
              <button onClick={onRemove} className="text-xs text-muted hover:text-danger">
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilePick({
  accept,
  label,
  busy,
  onPick,
}: {
  accept: string;
  label: string;
  busy: boolean;
  onPick: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
      <button onClick={() => ref.current?.click()} disabled={busy} className="btn btn-outline">
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}

/** Pick a font file, then confirm the family name before uploading. */
function FontUpload({
  onUpload,
  busy,
}: {
  onUpload: (file: File, family: string) => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: File; family: string } | null>(null);

  if (pending) {
    return (
      <div className="flex items-end gap-2">
        <label className="flex-1 space-y-1">
          <span className="label">Font name (how you’ll refer to it)</span>
          <input
            autoFocus
            value={pending.family}
            onChange={(e) => setPending({ ...pending, family: e.target.value })}
            className="input"
          />
        </label>
        <button
          onClick={() => {
            if (pending.family.trim()) onUpload(pending.file, pending.family.trim());
            setPending(null);
          }}
          disabled={busy || !pending.family.trim()}
          className="btn btn-primary"
        >
          {busy ? "Adding…" : "Add font"}
        </button>
        <button onClick={() => setPending(null)} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) {
            const base = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
            setPending({ file: f, family: base });
          }
        }}
      />
      <button onClick={() => ref.current?.click()} className="btn btn-outline">
        Upload font
      </button>
    </>
  );
}
