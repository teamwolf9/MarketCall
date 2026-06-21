import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getBrandForUser, listProjectsForBrand } from "@/server/queries";
import { createProject, deleteProject } from "@/server/actions";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  // The cascade check: no access here means a 404, not a leak of existence.
  const ctx = await getBrandForUser(userId, brandId);
  if (!ctx) notFound();
  const { brand, role } = ctx;
  const projects = (await listProjectsForBrand(userId, brandId)) ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">
          ← Brands
        </Link>
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold">{brand.name}</h1>
          <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
            {role}
          </span>
        </div>
        <p className="mt-2 text-neutral-400">Projects under this brand.</p>

        <section className="mt-8">
          <form action={createProject} className="flex gap-2">
            <input type="hidden" name="brandId" value={brand.id} />
            <input
              name="name"
              required
              placeholder="New project name…"
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Create
            </button>
          </form>

          {projects.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
              No projects yet.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="font-medium">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600">/{p.slug}</span>
                    <form action={deleteProject}>
                      <input type="hidden" name="projectId" value={p.id} />
                      <input type="hidden" name="brandId" value={brand.id} />
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
