import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolvePublicDeliverable } from "@/server/sharing";
import { kindLabel } from "@/lib/deliverables";
import { ShareActions } from "@/app/_components/share-actions";
import { Markdown } from "@/app/_components/markdown";

// Shared links must never be indexed by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Shared deliverable",
};

export default async function SharedDeliverablePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const deliverable = await resolvePublicDeliverable(token);
  if (!deliverable) notFound();

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <header>
          {deliverable.brandName && (
            <p className="text-sm font-medium text-ink-soft">
              {deliverable.brandName}
            </p>
          )}
          <div className="mt-1 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                {deliverable.title}
              </h1>
              <span className="badge shrink-0">{kindLabel(deliverable.kind)}</span>
            </div>
            <ShareActions
              title={deliverable.title}
              content={deliverable.content}
              tokens={deliverable.tokens}
            />
          </div>
        </header>

        <article className="doc-page mt-8 px-8 py-10 sm:px-12">
          {deliverable.content ? (
            <Markdown>{deliverable.content}</Markdown>
          ) : (
            <span className="text-muted">This deliverable is empty.</span>
          )}
        </article>

        <footer className="mt-16 border-t border-line pt-4 text-xs text-muted">
          Shared via MarketCall · view-only
        </footer>
      </main>
    </div>
  );
}
