"use client";

import { useState, useSyncExternalStore } from "react";
import { createShareLinkAction, revokeShareLinkAction } from "@/server/actions";

// Origin via useSyncExternalStore: "" during SSR/hydration (so markup matches),
// then the real origin on the client — no setState-in-effect, no mismatch.
const noopSubscribe = () => () => {};
const clientOrigin = () => window.location.origin;
const serverOrigin = () => "";

/** Live (non-revoked, non-expired) links for this deliverable, minimal shape. */
type LiveLink = { id: string; token: string };

export function SharePanel({
  deliverableId,
  projectId,
  links,
}: {
  deliverableId: string;
  projectId: string;
  links: LiveLink[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = useSyncExternalStore(noopSubscribe, clientOrigin, serverOrigin);

  async function copy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure origin) — the field is selectable as a fallback.
    }
  }

  const hidden = (
    <>
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="projectId" value={projectId} />
    </>
  );

  return (
    <section className="mt-8 border-t border-line pt-4">
      <h2 className="label">Public share</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Anyone with the link can view this deliverable — no login required. The
        page is view-only and not indexed by search engines. Revoke any time.
      </p>

      {links.length === 0 ? (
        <form action={createShareLinkAction} className="mt-3">
          {hidden}
          <button type="submit" className="btn btn-outline">
            Create share link
          </button>
        </form>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((l) => {
            const url = `${origin}/share/${l.token}`;
            return (
              <li key={l.id} className="flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="input flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => copy(l.id, url)}
                  className="btn btn-outline shrink-0"
                >
                  {copied === l.id ? "Copied" : "Copy"}
                </button>
                <form action={revokeShareLinkAction}>
                  <input type="hidden" name="linkId" value={l.id} />
                  {hidden}
                  <button
                    type="submit"
                    className="px-2 text-sm text-muted transition hover:text-danger"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            );
          })}
          <li>
            <form action={createShareLinkAction}>
              {hidden}
              <button type="submit" className="text-sm text-accent hover:underline">
                + Create another link
              </button>
            </form>
          </li>
        </ul>
      )}
    </section>
  );
}
