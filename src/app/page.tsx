import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

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
          The foundation is live: auth is gated, and the Org → Brand → Project
          hierarchy with cascading access is wired into the database layer.
        </p>

        {/* Placeholder hierarchy nav — wired to real data once a brand exists. */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Brands
            </h2>
            <button
              type="button"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              + New brand
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
            No brands yet. Create your first brand to start a project under it.
          </div>
        </section>

        <section className="mt-12 text-sm text-neutral-500">
          <h2 className="font-medium text-neutral-400">Next up</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Brand &amp; project CRUD wired through the cascade check.</li>
            <li>Provider abstraction + orchestrator + first two specialist agents.</li>
            <li>pgvector memory &amp; RAG over brand data.</li>
          </ol>
          <p className="mt-4">
            See{" "}
            <Link href="/sign-in" className="underline">
              sign-in
            </Link>{" "}
            and the README for the full build sequence.
          </p>
        </section>
      </main>
    </div>
  );
}
