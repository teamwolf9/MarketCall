# MarketCall

A private, password-gated marketing-operations platform for running multiple
brands and their projects from one place — driven by chat. See
[`docs/BRIEF.md`](docs/BRIEF.md) for the full product brief.

## Status

**Milestone 1 — Auth + hierarchy (in progress).** This is the foundation
everything else sits on:

- ✅ Next.js (App Router, TypeScript, Tailwind) on the recommended stack
- ✅ Clerk identity, middleware-gated app (`/sign-in`, `/sign-up`, public `/share/*`)
- ✅ Drizzle schema: `orgs → brands → projects` + `memberships`
- ✅ **Cascade access check** — `src/server/auth/access.ts`
- ⬜ Brand / project CRUD through the access check
- ⬜ Invites (pending membership → activates on sign-in)

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
cp .env.example .env.local      # fill in Clerk keys + DATABASE_URL
pnpm db:push                    # create the schema in your Postgres
pnpm dev                        # http://localhost:3000
```

You'll need a [Clerk](https://clerk.com) application (publishable + secret keys)
and a Postgres database ([Supabase](https://supabase.com) or
[Neon](https://neon.tech)). Drop both into `.env.local`.

**Moving to another machine (Windows + VS Code)?** Follow
[`docs/SETUP.md`](docs/SETUP.md) — step-by-step clone-to-running guide.

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

1. **Auth + Org → Brand → Project hierarchy + cascade check.** ← we are here
2. Provider abstraction + orchestrator + two specialist agents.
3. Data schema + pgvector memory + RAG; MCP tools so the chat can act.
4. Durable job layer for long agent runs.
5. Sharing: collaborator invites + public secret-link deliverables.
6. Voice input, optional TTS, PWA polish.
