"use client";

import { useState } from "react";
import { saveBrandGuide } from "@/server/brand-guide-actions";
import { slugify } from "@/lib/slug";
import {
  brandGuideToMarkdown,
  EXPORT_FONTS,
  type AssetSummary,
  type BrandColor,
  type BrandGuideData,
} from "@/lib/brand-guide";

const CORE_COLORS: { key: keyof Omit<BrandGuideData["colors"], "palette">; label: string; note: string }[] = [
  { key: "primary", label: "Primary", note: "Headlines & brand moments" },
  { key: "accent", label: "Accent", note: "Lines, links, highlights" },
  { key: "ink", label: "Text", note: "Body copy" },
  { key: "paper", label: "Background", note: "Pages & slides" },
];

function isHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function ColorField({
  label,
  note,
  value,
  onChange,
  disabled,
}: {
  label: string;
  note?: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="h-20 w-full" style={{ background: isHex(value) ? value : "#ccc" }} />
      <div className="p-3">
        <div className="text-sm font-medium text-ink">{label}</div>
        {note && <div className="text-xs text-muted">{note}</div>}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={isHex(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            disabled={disabled}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-line bg-transparent disabled:opacity-50"
            aria-label={`${label} color`}
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="input font-mono text-xs uppercase"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {desc && <p className="mt-1 text-sm text-ink-soft">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BrandGuideEditor({
  brandId,
  brandName,
  initial,
  canEdit,
  customFonts,
  assetSummary,
}: {
  brandId: string;
  brandName: string;
  initial: BrandGuideData;
  canEdit: boolean;
  customFonts: string[];
  assetSummary: AssetSummary;
}) {
  const [guide, setGuide] = useState<BrandGuideData>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function setColor(key: keyof Omit<BrandGuideData["colors"], "palette">, v: string) {
    setGuide((g) => ({ ...g, colors: { ...g.colors, [key]: v } }));
  }
  function setPalette(palette: BrandColor[]) {
    setGuide((g) => ({ ...g, colors: { ...g.colors, palette } }));
  }
  function setFont(which: "heading" | "body", v: string) {
    setGuide((g) => ({ ...g, fonts: { ...g.fonts, [which]: v } }));
  }
  function setField(key: "voice" | "wordsUse" | "wordsAvoid" | "imagery" | "logoUsage", v: string) {
    setGuide((g) => ({ ...g, [key]: v }));
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    const ok = await saveBrandGuide(brandId, guide);
    setSaving(false);
    setStatus(ok ? "saved" : "error");
  }

  function exportMarkdown() {
    const md = brandGuideToMarkdown(brandName, guide, assetSummary);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(brandName)}-brand-guide.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const known = [...customFonts, ...EXPORT_FONTS];
  const fontSelect = (which: "heading" | "body") => (
    <select
      value={guide.fonts[which]}
      onChange={(e) => setFont(which, e.target.value)}
      disabled={!canEdit}
      className="input"
    >
      {known.includes(guide.fonts[which]) ? null : (
        <option value={guide.fonts[which]}>{guide.fonts[which]}</option>
      )}
      {customFonts.length > 0 && (
        <optgroup label="Brand fonts">
          {customFonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="System fonts">
        {EXPORT_FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </optgroup>
    </select>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl surface-inset px-4 py-3">
        <div className="text-sm text-ink-soft">
          Export the full guide as Markdown to feed it to other AI tools.
        </div>
        <button onClick={exportMarkdown} className="btn btn-outline">
          ↓ Export Markdown
        </button>
      </div>

      {/* Colors */}
      <Section
        title="Color palette"
        desc="These drive your decks, PDFs, and on-brand generation."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CORE_COLORS.map((c) => (
            <ColorField
              key={c.key}
              label={c.label}
              note={c.note}
              value={guide.colors[c.key]}
              onChange={(v) => setColor(c.key, v)}
              disabled={!canEdit}
            />
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Brand palette</span>
            {canEdit && (
              <button
                onClick={() => setPalette([...guide.colors.palette, { name: "", hex: "#000000" }])}
                className="text-xs text-accent hover:text-accent-hover"
              >
                + Add color
              </button>
            )}
          </div>
          {guide.colors.palette.length === 0 ? (
            <p className="text-sm text-muted">Optional extra named colors (e.g. “Sky”, “Sand”).</p>
          ) : (
            <div className="space-y-2">
              {guide.colors.palette.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isHex(c.hex) ? c.hex : "#000000"}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const p = [...guide.colors.palette];
                      p[i] = { ...c, hex: e.target.value.toUpperCase() };
                      setPalette(p);
                    }}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line disabled:opacity-50"
                  />
                  <input
                    value={c.name}
                    disabled={!canEdit}
                    placeholder="Name"
                    onChange={(e) => {
                      const p = [...guide.colors.palette];
                      p[i] = { ...c, name: e.target.value };
                      setPalette(p);
                    }}
                    className="input flex-1"
                  />
                  <input
                    value={c.hex}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const p = [...guide.colors.palette];
                      p[i] = { ...c, hex: e.target.value };
                      setPalette(p);
                    }}
                    className="input w-28 font-mono text-xs uppercase"
                  />
                  {canEdit && (
                    <button
                      onClick={() => setPalette(guide.colors.palette.filter((_, j) => j !== i))}
                      className="px-1 text-muted hover:text-danger"
                      aria-label="Remove color"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" desc="The fonts used on decks and documents.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label">Headings</span>
            <div className="mt-2">{fontSelect("heading")}</div>
            <div
              className="mt-3 rounded-lg surface-inset p-4"
              style={{ fontFamily: guide.fonts.heading }}
            >
              <div className="text-3xl text-ink">Aa</div>
              <div className="text-lg text-ink-soft">The quick brown fox</div>
            </div>
          </div>
          <div>
            <span className="label">Body</span>
            <div className="mt-2">{fontSelect("body")}</div>
            <div
              className="mt-3 rounded-lg surface-inset p-4 text-sm leading-relaxed text-ink-soft"
              style={{ fontFamily: guide.fonts.body }}
            >
              Your brand’s story, told consistently. This is how body copy reads
              across every asset you produce.
            </div>
          </div>
        </div>
      </Section>

      {/* Voice & imagery */}
      <Section title="Voice & imagery" desc="How the brand sounds and looks — fed into AI generation.">
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="label">Voice & tone</span>
            <textarea
              value={guide.voice}
              disabled={!canEdit}
              onChange={(e) => setField("voice", e.target.value)}
              rows={2}
              placeholder="Warm, confident, a little playful — like a knowledgeable friend."
              className="input resize-y"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="label">Words to use</span>
              <textarea
                value={guide.wordsUse}
                disabled={!canEdit}
                onChange={(e) => setField("wordsUse", e.target.value)}
                rows={2}
                placeholder="members, journey, fresh"
                className="input resize-y"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Words to avoid</span>
              <textarea
                value={guide.wordsAvoid}
                disabled={!canEdit}
                onChange={(e) => setField("wordsAvoid", e.target.value)}
                rows={2}
                placeholder="cheap, users, synergy"
                className="input resize-y"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="label">Imagery style</span>
            <textarea
              value={guide.imagery}
              disabled={!canEdit}
              onChange={(e) => setField("imagery", e.target.value)}
              rows={2}
              placeholder="Bright, natural light; real people; minimal props; warm tones."
              className="input resize-y"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Logo usage notes</span>
            <textarea
              value={guide.logoUsage}
              disabled={!canEdit}
              onChange={(e) => setField("logoUsage", e.target.value)}
              rows={2}
              placeholder="Keep clear space around it; never recolor; don’t place on busy photos."
              className="input resize-y"
            />
          </label>
        </div>
      </Section>

      {canEdit && (
        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          {status === "saved" && (
            <span className="text-sm text-success">Saved ✓</span>
          )}
          {status === "error" && (
            <span className="text-sm text-danger">Couldn’t save.</span>
          )}
          <button onClick={save} disabled={saving} className="btn btn-primary shadow-md">
            {saving ? "Saving…" : "Save brand guide"}
          </button>
        </div>
      )}
    </div>
  );
}
