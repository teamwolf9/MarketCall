# MarketCall — Project Brief

## What it is

MarketCall is a private, password-gated marketing operations platform for running multiple brands and their projects from one place. You drive it by chat — a conversational orchestrator ("Jarvis"-style) that takes typed or spoken input, works across Claude, Gemini, and GPT, draws on your own data, and produces real marketing deliverables: plans, calendars, copy, and presentations. It runs in the browser on every device you use — workstations, MacBooks, phone — with nothing to install or sync. Collaborators can be invited at the brand or project level, and finished deliverables can be shared by private direct link without a password.

## Load-bearing principles

These are the decisions everything else depends on:

- **The browser never talks to Claude/Gemini/GPT directly.** Your server holds all API keys and routes every request. This is what makes the system secure, controllable, and genuinely multi-provider.
- **One source of truth.** State lives server-side; every device is just a window into it. There is nothing to sync between machines.
- **Text first, voice optional.** Typing is the primary way in; speech is a bolt-on for the times you can talk out loud.
- **Draft and publish are different privilege levels.** Anything that touches a live client account stops at a human confirmation.
- **The orchestrator routes; specialists do the work.** You talk to one assistant; it delegates behind the scenes.

## Architecture

- **Chat interface** — streaming chat UI, auth-gated, installable as a PWA on the phone. Text plus optional voice in.
- **Orchestrator agent** — reads intent, routes to the right specialist(s) and model(s), synthesizes the reply.
- **Specialist agents** — SEO, ad copy, social calendar, analytics, and so on. Each is a role + system prompt + tools + preferred model.
- **Provider abstraction** — one interface over all three providers (Vercel AI SDK, or a gateway like OpenRouter / LiteLLM) so each task picks the best model.
- **Data + memory** — Postgres (Supabase/Neon) for structured data; pgvector for long-term/semantic memory and RAG over your brand data; Cloudflare R2 for assets.
- **Tools / MCP** — gives the chat the ability to *act*: query data, write drafts, pull metrics, generate assets.
- **Durable jobs** — Inngest or Trigger.dev for long-running agent work that can't fit inside a single chat request.

## Multi-brand / multi-project and access

Hierarchy: **Org** (your agency) → **Brand** → **Project** → resources (plans, decks, threads, assets).

- **Membership** = person × scope (brand or project) × role.
- **Cascade rule:** an access check resolves as — org owner? OR member of the project's parent brand? OR member of the project itself. Brand access flows down to every project inside it; project access stays narrow and doesn't leak to siblings.
- **Roles (keep few):** owner, admin, editor, viewer, plus an optional client role (view + comment).
- **Enforcement:** row-level filtering by the set of scopes the person can reach (Supabase RLS or the app layer).
- **Identity vs authorization:** identity lives in Clerk or WorkOS; the brand/project authorization graph lives in your own Postgres, because their built-in org primitive is single-level.
- **Invites:** invite by email at a chosen scope + role → pending membership → activates on sign-in.

## Sharing — two separate mechanisms

1. **Collaborators (logged in).** Invited people with a scoped role who come in and work. Brand- or project-level.
2. **Public direct links (no login).** Finished deliverables served at an unguessable token URL (e.g. `/share/<random-token>`). Make them revocable, expiring, view-only, and `noindex`, with an optional soft email-capture gate. Right for client plans and decks; not for sensitive data.

Deliverables render as pages (Puck-driven, on-brand) so a link always shows the latest version. Add a "download PPTX/PDF" button for people who want a file in hand.

## Access across devices

- **Web app + PWA:** the same URL on every workstation, MacBook, and the phone; installable home-screen icon, full-screen launch.
- **Input:** typing is the default; voice via the browser's speech-to-text (quick) or Whisper/Deepgram (higher quality) feeds the same pipeline.
- **Optional spoken replies** via ElevenLabs for hands-free moments.

## Recommended stack (mapped to what you already run)

- Next.js on Vercel — app + API
- Clerk or WorkOS — auth / identity
- Supabase or Neon (Postgres) + pgvector — data, memory, RAG
- Cloudflare R2 — asset storage
- Puck — page/deck rendering and visual canvas
- Vercel AI SDK (or OpenRouter / LiteLLM gateway) — multi-provider abstraction *(new)*
- Inngest or Trigger.dev — durable background jobs *(new)*
- MCP — agent tools and data access

Most of this is already your stack. The two genuinely new pieces are the provider abstraction and the durable-job layer.

## Open decisions

- Build MarketCall as a **module inside your existing agency builder**, stand it up as a **standalone app** sharing the same infrastructure, or **accelerate with an agent platform** (e.g. n8n) and wire your data in.
- Which specialist agents to build first.
- Build-vs-buy lean for the orchestration layer.

## Suggested build sequence

1. Auth + the Org → Brand → Project hierarchy + memberships and the cascade check.
2. Provider abstraction + one orchestrator + two real specialist agents (proves multi-model routing).
3. Data schema + pgvector memory + RAG over brand data; wire MCP tools so the chat can act.
4. Durable job layer for long agent runs.
5. Sharing: collaborator invites + public secret-link deliverables + deck/plan page rendering.
6. Voice input, optional TTS, and PWA polish.
