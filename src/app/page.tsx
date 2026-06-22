import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { TopNav } from "@/app/nav";
import { listBrandsForUser } from "@/server/queries";
import { createBrand, deleteBrand } from "@/server/actions";
import { activatePendingInvites } from "@/server/memberships";
import { Landing } from "@/app/_components/landing";
import { BrandLogo } from "@/app/_components/brand-logo";

export default async function Home() {
  const { userId } = await auth();

  // Signed-out visitors get the public marketing landing.
  if (!userId) return <Landing />;

  const user = await currentUser();

  // First stop after sign-in: bind any invites sent to this person's email.
  if (user) {
    await activatePendingInvites(userId, user.primaryEmailAddress?.emailAddress);
  }

  const brands = await listBrandsForUser(userId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopNav active="brands" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="rise mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Your brands live here. Each holds its own projects, and access cascades
          from a brand down to every project inside it.
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <span className="label">Brands</span>
            <span className="text-xs text-muted">
              {brands.length} {brands.length === 1 ? "brand" : "brands"}
            </span>
          </div>

          <form action={createBrand} className="mt-4 flex gap-2">
            <input
              name="name"
              required
              placeholder="New brand name…"
              className="input flex-1"
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Create brand
            </button>
          </form>

          {brands.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface/50 p-12 text-center">
              <p className="text-sm text-ink-soft">
                No brands yet. Create your first brand to start a project under it.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="group relative card p-5 transition-shadow hover:shadow-md"
                >
                  <Link href={`/brands/${b.id}`} className="block">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo name={b.name} logoUrl={b.logoUrl} size={32} />
                      <div className="min-w-0">
                        <div className="truncate font-display text-lg font-semibold text-ink">
                          {b.name}
                        </div>
                        <div className="font-mono text-xs text-muted">
                          /{b.slug}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1 text-sm text-accent">
                      Open
                      <span className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </Link>
                  <form
                    action={deleteBrand}
                    className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100"
                  >
                    <input type="hidden" name="brandId" value={b.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-xs text-muted hover:text-danger"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
        </main>
      </div>
    </div>
  );
}
