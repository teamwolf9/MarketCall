import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { GlobalLinks } from "@/app/nav";
import { getBrandForUser, listProjectsForBrand } from "@/server/queries";
import {
  createProject,
  deleteProject,
  inviteMember,
  removeMember,
} from "@/server/actions";
import { listScopeMembers } from "@/server/memberships";
import { listUpcomingForBrand } from "@/server/calendar";
import { roleAtLeast } from "@/server/auth/access";
import { projectColor } from "@/lib/colors";
import { shortDate, timeLabel } from "@/lib/dates";

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
  const members = await listScopeMembers("brand", brand.id);
  const upcoming = await listUpcomingForBrand(userId, brandId);
  const canManage = roleAtLeast(role, "admin");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-ink-soft transition-colors hover:text-ink">
              Brands
            </Link>
            <span className="text-line-strong">/</span>
            <span className="text-ink">{brand.name}</span>
          </nav>
          <div className="flex items-center gap-4">
            <GlobalLinks />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="rise mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {brand.name}
          </h1>
          <span className="badge">{role}</span>
        </div>
        <p className="mt-2 text-[15px] text-ink-soft">
          Projects under this brand. Open one to work with the assistant.
        </p>

        {/* Projects */}
        <section className="mt-10">
          <span className="label">Projects</span>

          <form action={createProject} className="mt-4 flex gap-2">
            <input type="hidden" name="brandId" value={brand.id} />
            <input
              name="name"
              required
              placeholder="New project name…"
              className="input flex-1"
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Create project
            </button>
          </form>

          {projects.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface/50 p-12 text-center text-sm text-ink-soft">
              No projects yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group relative card p-5 transition-shadow hover:shadow-md"
                >
                  <Link href={`/projects/${p.id}`} className="block">
                    <div className="font-display text-lg font-semibold text-ink">
                      {p.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted">
                      /{p.slug}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1 text-sm text-accent">
                      Open chat
                      <span className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </Link>
                  <form
                    action={deleteProject}
                    className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100"
                  >
                    <input type="hidden" name="projectId" value={p.id} />
                    <input type="hidden" name="brandId" value={brand.id} />
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

        {/* Upcoming — calendar list across all of this brand's projects */}
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <span className="label">Upcoming</span>
            <Link
              href="/calendar"
              className="text-sm text-accent underline-offset-2 hover:underline"
            >
              Open calendar →
            </Link>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            What&apos;s scheduled across this brand&apos;s projects, color-coded by
            project.
          </p>

          {upcoming.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface/50 p-10 text-center text-sm text-ink-soft">
              Nothing scheduled yet. Plan content in a project&apos;s chat and it
              shows up here.
            </div>
          ) : (
            <ul className="card mt-4 divide-y divide-line">
              {upcoming.map((e) => {
                const c = projectColor(e.projectId);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.dot }}
                      aria-hidden
                    />
                    <div className="w-28 shrink-0 text-xs text-muted">
                      {shortDate(e.startsAt)}
                      {!e.allDay && ` · ${timeLabel(e.startsAt)}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {e.title}
                      </div>
                      {e.channel && (
                        <div className="truncate text-xs text-muted">
                          {e.channel}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/projects/${e.projectId}`}
                      className="badge shrink-0 hover:opacity-80"
                      style={{
                        backgroundColor: c.bg,
                        color: c.text,
                        borderColor: c.border,
                      }}
                    >
                      {e.projectName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Members */}
        <section className="mt-14">
          <span className="label">Members</span>
          <p className="mt-1 text-sm text-ink-soft">
            People here cascade down to every project inside the brand.
          </p>

          {canManage && (
            <form action={inviteMember} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="brandId" value={brand.id} />
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@email.com"
                className="input flex-1"
              />
              <select name="role" defaultValue="editor" className="input w-auto">
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
                <option value="client">client</option>
              </select>
              <button type="submit" className="btn btn-outline whitespace-nowrap">
                Send invite
              </button>
            </form>
          )}

          {members.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface/50 p-10 text-center text-sm text-ink-soft">
              No members yet. The org owner has full access by default.
            </div>
          ) : (
            <ul className="card mt-4 divide-y divide-line">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {m.email ?? m.userId ?? "—"}
                    </span>
                    {m.status === "pending" && (
                      <span className="badge">pending</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge">{m.role}</span>
                    {canManage && (
                      <form action={removeMember}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <input type="hidden" name="brandId" value={brand.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted hover:text-danger"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        </main>
      </div>
    </div>
  );
}
