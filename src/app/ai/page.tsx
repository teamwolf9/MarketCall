import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TopNav } from "@/app/nav";
import { ensureOrgForUser } from "@/server/orgs";
import { listProviders } from "@/server/ai/providers";
import { aiConfigured, modelLabel } from "@/server/ai/models";
import { setActiveProvider, deleteProvider } from "@/server/ai/manage";
import { AddProviderForm } from "./add-provider-form";

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function AiDashboard() {
  const { userId } = await auth();
  if (!userId) notFound();
  const orgId = await ensureOrgForUser(userId);

  const providers = await listProviders(orgId);
  const active = providers.find((p) => p.isActive) ?? null;
  const envConfigured = aiConfigured();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopNav active="ai" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="rise mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          AI providers
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          The chat runs on whichever provider is active below. Keys are stored
          encrypted and never leave the server.
        </p>

        {/* Active summary */}
        <section className="card mt-8 p-5">
          <div className="label">Currently using</div>
          {active ? (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold text-ink">
                {active.name}
              </span>
              <span className="font-mono text-sm text-ink-soft">
                {active.providerType} · {active.model}
              </span>
            </div>
          ) : envConfigured ? (
            <div className="mt-2">
              <span className="font-display text-xl font-semibold text-ink">
                Environment
              </span>
              <span className="ml-2 font-mono text-sm text-ink-soft">
                {modelLabel("default")}
              </span>
              <p className="mt-1 text-xs text-muted">
                Set in .env.local. Add a provider below to manage it here instead.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-accent-hover">
              No provider configured. Add one below to start chatting.
            </p>
          )}
        </section>

        {/* Saved providers */}
        {providers.length > 0 && (
          <section className="mt-10">
            <span className="label">Saved providers</span>
            <ul className="card mt-3 divide-y divide-line">
              {providers.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{p.name}</span>
                      {p.isActive && <span className="badge badge-success">active</span>}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted">
                      {p.providerType} · {p.model}
                      {hostOf(p.baseUrl) ? ` · ${hostOf(p.baseUrl)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {!p.isActive && (
                      <form action={setActiveProvider}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-accent hover:text-accent-hover">
                          Set active
                        </button>
                      </form>
                    )}
                    <form action={deleteProvider}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs text-muted hover:text-danger">
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Add provider */}
        <section className="card mt-10 p-6">
          <span className="label">Add a provider</span>
          <p className="mt-1 mb-5 text-sm text-ink-soft">
            Pick a preset to prefill, drop in your key, and we’ll test the
            connection before saving.
          </p>
          <AddProviderForm />
        </section>
        </main>
      </div>
    </div>
  );
}
