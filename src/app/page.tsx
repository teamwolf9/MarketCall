import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { listBrandsForUser } from "@/server/queries";
import { createBrand, deleteBrand } from "@/server/actions";

export default async function Home() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const brands = userId ? await listBrandsForUser(userId) : [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">MarketCall</span>
          <span className="text-xs text-neutral-500">marketing ops, by chat</span>
        </div>
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
        </h1>
        <p className="mt-2 text-neutral-400">
          Your brands live here. Each brand holds projects; access cascades from
          brand down to every project inside it.
        </p>

        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Brands
          </h2>

          <form action={createBrand} className="mt-4 flex gap-2">
            <input
              name="name"
              required
              placeholder="New brand name…"
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Create
            </button>
          </form>

          {brands.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
              No brands yet. Create your first brand to start a project under it.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
              {brands.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <Link
                    href={`/brands/${b.id}`}
                    className="font-medium hover:underline"
                  >
                    {b.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600">/{b.slug}</span>
                    <form action={deleteBrand}>
                      <input type="hidden" name="brandId" value={b.id} />
                      <button
                        type="submit"
                        className="text-xs text-neutral-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
