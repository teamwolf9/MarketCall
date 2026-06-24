# Setup — running MarketCall on another machine (Windows + VS Code)

This guide gets the project running on a fresh PC. It assumes Windows with
**Visual Studio Code** (not "Visual Studio" the C#/.NET IDE — VS Code is the
right tool for a Next.js app; if you only have full Visual Studio, install VS
Code from <https://code.visualstudio.com>). macOS is the same, minus the
IPv6/pooler note in step 4.

> **Fastest path:** if you already have MarketCall running on another machine,
> just copy that machine's **`.env.local`** to this one (step 4) — it has every
> secret already. Then do steps 1–3 and 6. The values in `.env.local` must match
> across machines that share the same database (see the warning in step 4).

---

## 1. Install the prerequisites

| Tool         | Version | How to install on Windows                                   |
| ------------ | ------- | ----------------------------------------------------------- |
| **Node.js**  | 20+ (22 LTS or newer recommended) | <https://nodejs.org> (LTS installer), or `winget install OpenJS.NodeJS.LTS` |
| **pnpm**     | latest  | After Node: open PowerShell and run `corepack enable pnpm`  |
| **Git**      | latest  | <https://git-scm.com/download/win>, or `winget install Git.Git` |
| **VS Code**  | latest  | <https://code.visualstudio.com>                             |

Verify in a **new** PowerShell window:

```powershell
node -v      # v20 or newer
pnpm -v      # any version
git --version
```

If `pnpm` is "not recognized" after `corepack enable pnpm`, close and reopen the
terminal (PATH needs to refresh), or run `npm install -g pnpm`.

---

## 2. Clone the repository

```powershell
cd C:\dev
git clone https://github.com/teamwolf9/MarketCall.git
cd MarketCall
code .
```

`code .` opens the project in VS Code. Run the rest in VS Code's integrated
terminal (**Terminal → New Terminal**, or `` Ctrl+` ``).

---

## 3. Install dependencies

```powershell
pnpm install
```

> Re-run `pnpm install` after every `git pull` — new features often add
> packages (e.g. the rich editor, image, and PPTX libraries).

---

## 4. Create `.env.local`

The app reads its secrets from **`.env.local`** in the project root. It is
gitignored, so you create it by hand. Copy the template and fill it in:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in VS Code and set the values. The **required** ones:

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require"
APP_ENCRYPTION_KEY="<32-byte base64 string>"
AI_PROVIDER="openai-compatible"
AI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
AI_API_KEY="<your model API key>"
AI_MODEL="gemini-2.5-flash"
```

See `.env.example` for the full list, optional features, and provider examples
(OpenAI, Gemini, OpenRouter, Groq, Ollama, Anthropic).

**Three things that bite people:**

- **Use the pooler URL, port 6543.** Supabase's direct host
  (`db.<ref>.supabase.co`) is IPv6-only and times out on most Windows machines.
  Get the right one from Supabase → **Connect → ORM** (the
  `...pooler.supabase.com:6543` string). The placeholder password there is
  `[YOUR-PASSWORD]` — replace it with your real DB password.
- **`APP_ENCRYPTION_KEY` must be identical on every machine** that shares this
  database. Provider API keys are encrypted with it; a different key can't
  decrypt what another machine saved. Generate one only for a brand-new setup:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Clerk keys are optional in development.** Left blank, Clerk runs in
  "keyless" mode and spins up a temporary dev login. To sign in, use any email
  like `you+clerk_test@example.com` with verification code **`424242`**.

> Editing `.env.local` in VS Code is safe (it saves UTF-8 without a BOM). Avoid
> creating it with PowerShell `Set-Content -Encoding utf8`, which adds a BOM that
> can stop the first line from loading.

---

## 5. Database

The Supabase database is **shared**, so all tables already exist — you do **not**
need to run migrations. Only relevant if you point at a brand-new database:

- The schema lives in `src/server/db/schema.ts`. `pnpm db:push` can hit a
  drizzle-kit introspection bug against an existing DB; the project applies
  tables with small SQL scripts instead. Ask the maintainer if you're standing
  up a fresh database.
- The brand-memory / RAG feature needs the **`pgvector`** extension enabled
  (Supabase → Database → Extensions → enable `vector`). Optional — memory just
  no-ops without an embeddings model configured.

---

## 6. Run the app

```powershell
pnpm dev
```

Open <http://localhost:3000>. You'll be sent to sign-in — create an account
(keyless: `you+clerk_test@example.com` + code `424242`), then create a brand,
a project, and start chatting with the agents.

---

## Useful scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Run the dev server (hot reload)       |
| `pnpm build`       | Production build (verifies types)     |
| `pnpm start`       | Run the production build              |
| `pnpm lint`        | ESLint                                |
| `pnpm db:studio`   | Open Drizzle Studio (browse the DB)   |

---

## Troubleshooting

- **`pnpm` not recognized** — reopen the terminal after `corepack enable pnpm`,
  or `npm install -g pnpm`.
- **`DATABASE_URL is not set`** — `.env.local` is missing or misnamed. It must be
  exactly `.env.local` in the project root (not `.env` or `.env.local.txt` —
  Windows may hide the extension; enable "File name extensions" in Explorer).
- **`password authentication failed for user "postgres"` (28P01)** — the DB
  password in `DATABASE_URL` is wrong or was reset on another machine (there's
  only one DB password). Reset it in Supabase → **Project Settings → Database →
  Reset database password**, then paste the new value. Supabase's pooler caches
  credentials, so right after a reset it can keep rejecting for a few seconds —
  retry, and if it persists, **Restart the project** (Settings → General) to
  flush the cache.
- **DB connection hangs / times out (ENOTFOUND/CONNECT_TIMEOUT)** — you're using
  the `db.<ref>.supabase.co` direct host (IPv6-only). Switch to the
  `...pooler.supabase.com:6543` URL.
- **Clerk error on the AI / provider features** — the in-app provider manager
  needs `APP_ENCRYPTION_KEY`. Set it (and keep it the same across machines).
- **Port 3000 in use** — `pnpm dev -- -p 3001` and open that port.

---

## Working in VS Code

- Open the integrated terminal with `` Ctrl+` `` to run the commands above.
- Source layout:
  - `src/app/` — pages, routes, and UI (Next.js App Router)
  - `src/server/` — database, auth/access checks, AI agents, server actions
  - `src/lib/` — shared client-safe helpers
- After pulling new changes (`git pull`), run `pnpm install` in case
  dependencies changed.
