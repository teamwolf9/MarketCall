"use client";

import Link from "next/link";
import {
  MessagesSquare,
  Brain,
  FileText,
  CalendarDays,
  Share2,
  Workflow,
  ArrowRight,
} from "lucide-react";
import { AnimatedGroup, AnimatedItem } from "@/app/_components/animated";

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Chat that acts",
    body: "One assistant routes to specialists and actually does the work — schedules posts, drafts copy, saves deliverables.",
  },
  {
    icon: Brain,
    title: "Brand memory",
    body: "Semantic memory over each brand's past work, so every reply stays on-voice instead of starting from scratch.",
  },
  {
    icon: FileText,
    title: "Real deliverables",
    body: "Plans, ad copy, and calendars become durable artifacts you can edit, export to PDF, and revisit.",
  },
  {
    icon: CalendarDays,
    title: "Content calendar",
    body: "The assistant puts campaigns on a shared calendar across every brand and project you run.",
  },
  {
    icon: Workflow,
    title: "Durable jobs",
    body: "Long runs — a full campaign from strategy to calendar to copy — work in the background and persist.",
  },
  {
    icon: Share2,
    title: "Share anything",
    body: "Send a client a view-only link, or invite collaborators at the brand or project level. Revocable, no login.",
  },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
      <span className="font-display text-xl font-semibold text-ink">MarketCall</span>
    </span>
  );
}

/** A small faux-app mock — shows the real product (brands rail + chat + a tool chip). */
function AppMock() {
  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-line bg-paper text-left">
      <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-line p-3 sm:flex">
        <div className="label mb-1">Brands</div>
        {["Northwind", "Lumen Co.", "Atlas Foods"].map((b, i) => (
          <div
            key={b}
            className={`truncate rounded-lg px-2.5 py-1.5 text-sm ${
              i === 0 ? "bg-accent-soft text-accent-hover" : "text-ink-soft"
            }`}
          >
            {b}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-accent-ink">
          Plan a 1-week launch for the spring sale and add it to the calendar.
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-ink-soft">
          📅 Added to calendar — Teaser post · Apr 8
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2 text-sm text-ink">
          Done — 5 posts scheduled and a launch plan saved to Deliverables.
        </div>
        <div className="mt-auto flex items-center gap-2">
          <div className="h-9 flex-1 rounded-lg border border-line-strong bg-surface" />
          <div className="h-9 w-9 rounded-lg bg-accent" />
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(115% 90% at 50% -10%, var(--glow) 0%, transparent 55%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-20 sm:pt-28">
            <AnimatedGroup delay={0.1}>
              <AnimatedItem>
                <span className="chip cursor-default">
                  Bring your own model — Claude · Gemini · GPT
                </span>
              </AnimatedItem>
              <AnimatedItem>
                <h1 className="font-display mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl">
                  Marketing operations, run by chat.
                </h1>
              </AnimatedItem>
              <AnimatedItem>
                <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-soft">
                  Run every brand and project from one place. Talk to one
                  assistant — it plans, writes, schedules, and produces real
                  deliverables you can share.
                </p>
              </AnimatedItem>
              <AnimatedItem>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link href="/sign-up" className="btn btn-primary px-5 py-2.5 text-base">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/sign-in" className="btn btn-outline px-5 py-2.5 text-base">
                    Sign in
                  </Link>
                </div>
              </AnimatedItem>
            </AnimatedGroup>
          </div>

          {/* Product mock */}
          <AnimatedGroup delay={0.5} className="mx-auto max-w-6xl px-6">
            <AnimatedItem>
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent to-paper"
                />
                <div className="mx-auto h-[360px] overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] ring-1 ring-line/60">
                  <AppMock />
                </div>
              </div>
            </AnimatedItem>
          </AnimatedGroup>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="font-display max-w-2xl text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Everything a marketing team does, in one calm surface.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-hover">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-ink">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="card relative overflow-hidden p-10 text-center sm:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0"
              style={{
                background:
                  "radial-gradient(80% 120% at 50% 0%, var(--glow) 0%, transparent 60%)",
              }}
            />
            <h2 className="font-display relative text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Run your brands like one team.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-pretty text-ink-soft">
              Set it up in minutes with your own model key. Your data, your
              providers, your call.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href="/sign-up" className="btn btn-primary px-6 py-3 text-base">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted">
          <Wordmark />
          <span>Private marketing operations · bring your own model</span>
        </div>
      </footer>
    </div>
  );
}
