# MarketCall

A private, password-gated marketing-operations platform for running multiple
brands and their projects from one place — driven by chat. See
[`docs/BRIEF.md`](docs/BRIEF.md) for the full product brief.

## Status

Active development. Built so far:

- ✅ **Auth + hierarchy** — Clerk identity, Org → Brand → Project, memberships,
  invites, and the cascade access check (`src/server/auth/access.ts`)
- ✅ **Chat orchestrator** — routes each request to one of 16 specialist agents
  (strategy, ad copy, SEO, paid media, email, video, brand, and more);
  multi-provider, bring-your-own model endpoint
- ✅ **Marketing brief** — a guided, project-aware intake that grounds every agent
- ✅ **Brand guide** — per-brand design system (colors, fonts, voice) + an asset
  library (logos, fonts, images, docs); on-brand PPTX/PDF/Word exports
- ✅ **Deliverables** — rich document editor with image/logo insert, resize,
  text-wrap, an in-document "ask the agents" chat, and public share links
- ✅ **Calendar** — month/week views with per-project filtering
- ✅ **Durable jobs** — background campaign runs with a live activity indicator
- 🚧 RAG memory, automations, voice, and PWA polish — in progress

## Load-bearing decision: the cascade access rule

> Can a user reach a project? **Org owner?** OR **member of the project's parent
> brand?** OR **member of the project itself?**

Brand access flows *down* to every project inside it; project access stays
narrow and never leaks to siblings. Org ownership bypasses all scope checks.
This lives in [`src/server/auth/access.ts`](src/server/auth/access.ts) — the
server-side gate. The UI mirrors it but is never trusted; every data path that
touches a scoped resource calls through it.

Identity (the human, their login) lives in **Clerk**. The authorization graph
(who can reach which brand/project) lives in **our own Postgres**, because
Clerk's org primitive is single-level and our hierarchy is two levels deep.

## Stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| App + API      | Next.js (App Router) on Vercel          |
| Identity       | Clerk                                   |
| Data           | Postgres (Supabase / Neon) + Drizzle    |
| Memory / RAG   | pgvector *(later)*                      |
| Asset storage  | Cloudflare R2 *(later)*                 |
| AI providers   | Anthropic + OpenAI + Google, server-side only *(later)* |

> The browser never talks to an AI provider directly. The server holds all keys
> and routes every request — this is what makes the system multi-provider and
> controllable.

## Getting started

```bash
pnpm install
cp .env.example .env.local       # fill in DATABASE_URL, APP_ENCRYPTION_KEY, AI provider
pnpm dev                         # http://localhost:3000
```

Fill `.env.local` from [`.env.example`](.env.example). In development **Clerk
runs keyless** (no keys needed — sign up with `you+clerk_test@example.com` and
code `424242`), and the shared Postgres database already has the schema, so
there's nothing to migrate. You do need a `DATABASE_URL`, an `APP_ENCRYPTION_KEY`,
and an AI provider (any OpenAI-compatible endpoint, or Anthropic).

**Setting up on another machine (Windows + VS Code)?** Follow
**[`docs/SETUP.md`](docs/SETUP.md)** — a step-by-step clone-to-running guide,
including the Supabase pooler and encryption-key gotchas. The shortcut: copy your
working `.env.local` across.

## Scripts

| Script             | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Run the dev server                    |
| `pnpm build`       | Production build                      |
| `pnpm db:generate` | Generate SQL migrations from schema   |
| `pnpm db:migrate`  | Apply migrations                      |
| `pnpm db:push`     | Push schema directly (dev convenience)|
| `pnpm db:studio`   | Open Drizzle Studio                   |

## Build sequence

1. **Auth + Org → Brand → Project hierarchy + cascade check.** ✅
2. Provider abstraction + orchestrator + two specialist agents.
3. Data schema + pgvector memory + RAG; MCP tools so the chat can act.
4. Durable job layer for long agent runs.
5. Sharing: collaborator invites + public secret-link deliverables.
6. Voice input, optional TTS, PWA polish.
