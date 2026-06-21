import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { GlobalLinks } from "@/app/nav";
import type { Brand, Project, Role } from "@/server/db/schema";

export function ProjectHeader({
  brand,
  project,
  role,
  active,
  briefPct,
}: {
  brand: Brand;
  project: Project;
  role: Role;
  active: "chat" | "brief";
  briefPct: number;
}) {
  const tab = (href: string, key: "chat" | "brief", label: React.ReactNode) => (
    <Link
      href={href}
      className={
        active === key
          ? "relative pb-2 text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
          : "pb-2 text-ink-soft transition-colors hover:text-ink"
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex items-center justify-between py-3.5">
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
            <span className="text-ink">{project.name}</span>
            <span className="badge ml-1">{role}</span>
          </nav>
          <div className="flex items-center gap-4">
            <GlobalLinks />
            <UserButton />
          </div>
        </div>
        <nav className="flex items-center gap-5 text-sm font-medium">
          {tab(`/projects/${project.id}`, "chat", "Chat")}
          {tab(
            `/projects/${project.id}/brief`,
            "brief",
            <span className="inline-flex items-center gap-2">
              Brief
              <span className="badge">{briefPct}%</span>
            </span>,
          )}
        </nav>
      </div>
    </header>
  );
}
