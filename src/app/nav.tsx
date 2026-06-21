import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

/** Compact global links for pages that show a breadcrumb instead of the full TopNav. */
export function GlobalLinks() {
  return (
    <nav className="flex items-center gap-4 text-sm text-ink-soft">
      <Link href="/" className="transition-colors hover:text-ink">
        Brands
      </Link>
      <Link href="/calendar" className="transition-colors hover:text-ink">
        Calendar
      </Link>
      <Link href="/ai" className="transition-colors hover:text-ink">
        AI
      </Link>
    </nav>
  );
}

type Tab = "brands" | "calendar" | "ai";

/** Top-level tabs shared by the main pages. */
export function TopNav({ active }: { active: Tab }) {
  const tab = (href: string, key: Tab, label: string) => (
    <Link
      href={href}
      className={
        active === key
          ? "relative pb-1 text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
          : "pb-1 text-ink-soft transition-colors hover:text-ink"
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
              aria-hidden
            />
            <span className="font-display text-xl font-semibold text-ink">
              MarketCall
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            {tab("/", "brands", "Brands")}
            {tab("/calendar", "calendar", "Calendar")}
            {tab("/ai", "ai", "AI")}
          </nav>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
