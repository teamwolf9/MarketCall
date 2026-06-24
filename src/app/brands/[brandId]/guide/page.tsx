import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { GlobalLinks } from "@/app/nav";
import { getBrandGuideForUser } from "@/server/brand-guide";
import { listBrandAssets } from "@/server/brand-assets";
import { BrandGuideEditor } from "./brand-guide-editor";
import { AssetManager } from "./asset-manager";

const FONT_FORMAT: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

export default async function BrandGuidePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const ctx = await getBrandGuideForUser(userId, brandId);
  if (!ctx) notFound();
  const { brand, guide, canEdit } = ctx;

  const assets = await listBrandAssets(brandId);
  const fontAssets = assets.filter((a) => a.kind === "font" && a.fontFamily);
  const customFonts = [...new Set(fontAssets.map((a) => a.fontFamily!))];

  const LOGO_LABELS: Record<string, string> = {
    horizontal: "Horizontal",
    vertical: "Vertical",
    reversed: "Reversed (on dark)",
  };
  const assetSummary = {
    logos: [
      ...(brand.logoUrl ? ["Icon"] : []),
      ...assets
        .filter((a) => a.kind === "logo")
        .map((a) => LOGO_LABELS[a.variant ?? ""] ?? a.variant ?? "Logo"),
    ],
    fonts: customFonts,
    documents: assets.filter((a) => a.kind === "document").map((a) => a.label),
  };

  // @font-face so uploaded brand fonts render in the editor previews.
  const fontFaceCss = fontAssets
    .map((a) => {
      const ext = a.fileName.toLowerCase().split(".").pop() ?? "";
      const fmt = FONT_FORMAT[ext] ?? "woff2";
      return `@font-face{font-family:"${a.fontFamily}";src:url("/api/brand-assets/${a.id}") format("${fmt}");font-display:swap;}`;
    })
    .join("\n");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {fontFaceCss && <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />}

      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-ink-soft transition-colors hover:text-ink">
              Brands
            </Link>
            <span className="text-line-strong">/</span>
            <Link
              href={`/brands/${brand.id}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {brand.name}
            </Link>
            <span className="text-line-strong">/</span>
            <span className="text-ink">Brand guide</span>
          </nav>
          <div className="flex items-center gap-4">
            <GlobalLinks />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="rise mx-auto w-full max-w-4xl px-6 py-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {brand.name} — Brand guide
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            The design system for this brand. Everything we create — decks, PDFs,
            social, copy — draws on these colors, fonts, logos, and voice.
            {!canEdit && " You have view-only access."}
          </p>

          {/* Assets / uploads */}
          <section className="mt-8 card p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Logos, fonts & files
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Upload the brand’s logos, fonts, and documents. Stored with the brand
              and reusable across every project.
            </p>
            <div className="mt-5">
              <AssetManager
                brandId={brand.id}
                brandName={brand.name}
                logoUrl={brand.logoUrl}
                canEdit={canEdit}
                assets={assets}
              />
            </div>
          </section>

          {/* Structured tokens */}
          <div className="mt-8">
            <BrandGuideEditor
              brandId={brand.id}
              brandName={brand.name}
              initial={guide}
              canEdit={canEdit}
              customFonts={customFonts}
              assetSummary={assetSummary}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
