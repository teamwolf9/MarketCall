# Setup — running MarketCall on another machine (Windows + VS Code)

This guide gets the project running on a fresh PC. It assumes Windows with
**Visual Studio Code** (not "Visual Studio" the C#/.NET IDE — VS Code is the
right tool for a Next.js app; if you only have full Visual Studio, install VS
Code from <https://code.visualstudio.com>).

> The secret values (Clerk keys, database URL) are **not** in the repo — they're
> gitignored. Get them from the person who set the project up and paste them into
> `.env.local` in step 4.

---

## 1. Install the prerequisites

| Tool         | Version | How to install on Windows                                   |
| ------------ | ------- | ----------------------------------------------------------- |
| **Node.js**  | 20+ (22 LTS recommended) | <https://nodejs.org> (LTS installer), or `winget install OpenJS.NodeJS.LTS` |
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

### Recommended VS Code extensions

Open VS Code → Extensions (Ctrl+Shift+X) and install:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Prettier** (`esbenp.prettier-vscode`)

---

## 2. Clone the repository

In PowerShell, from wherever you keep code (e.g. `C:\dev`):

```powershell
cd C:\dev
git clone https://github.com/teamwolf9/MarketCall.git
cd MarketCall
code .
```

`code .` opens the project in VS Code. The rest of the commands can be run in
VS Code's integrated terminal (**Terminal → New Terminal**, or `` Ctrl+` ``).

---

## 3. Install dependencies

```powershell
pnpm install
```

The first run will ask to approve native build scripts (esbuild, sharp). The
repo already allows them in `pnpm-workspace.yaml`, so this should be automatic.

---

## 4. Create `.env.local`

The app reads secrets from a file named **`.env.local`** in the project root.
It is gitignored, so you must create it by hand.

Copy the template and then fill in the real values:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in VS Code and set these three (get the values from whoever
set up the project — see the chat / password manager):

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

> **Why the pooler URL?** The direct `db.<ref>.supabase.co` host is IPv6-only and
> fails on many machines. The `...pooler.supabase.com` URL is IPv4 and works
> everywhere — keep it.

The other keys in the file (AI providers, R2) are optional and not needed to run
the auth + brand/project features yet.

---

## 5. (Optional) Sync the database schema

The Supabase database is shared, so the tables already exist — you do **not**
need to recreate them. Only run this if you changed `src/server/db/schema.ts`:

```powershell
pnpm db:push
```

> Drizzle commands need `DATABASE_URL` in the environment. On Windows, the
> simplest way is to run them through the dev tooling, or set it for the session:
> `$env:DATABASE_URL = (Get-Content .env.local | Select-String '^DATABASE_URL').ToString().Split('=',2)[1].Trim('"')` then `pnpm db:push`.

---

## 6. Run the app

```powershell
pnpm dev
```

Open <http://localhost:3000>. You'll be redirected to Clerk sign-in; create an
account or sign in, then you can create brands and projects.

---

## Useful scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Run the dev server (hot reload)       |
| `pnpm build`       | Production build (verifies types)     |
| `pnpm start`       | Run the production build              |
| `pnpm lint`        | ESLint                                |
| `pnpm db:push`     | Push schema changes to Postgres       |
| `pnpm db:studio`   | Open Drizzle Studio (browse the DB)   |

---

## Troubleshooting

- **`pnpm` not recognized** — reopen the terminal after `corepack enable pnpm`,
  or `npm install -g pnpm`.
- **`DATABASE_URL is not set`** — `.env.local` is missing or misnamed. It must be
  exactly `.env.local` in the project root (not `.env` or `.env.local.txt` —
  Windows may hide the real extension; enable "File name extensions" in Explorer).
- **DB connection hangs / ENOTFOUND** — make sure you're using the
  `pooler.supabase.com` URL from step 4, not the `db.<ref>.supabase.co` one.
- **Clerk error on load** — both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
  `CLERK_SECRET_KEY` must be set; restart `pnpm dev` after editing `.env.local`.
- **Port 3000 in use** — run `pnpm dev -- -p 3001` and open that port instead.

---

## Working in VS Code

- Open the integrated terminal with `` Ctrl+` `` to run the commands above.
- The app source is under `src/`. Key folders:
  - `src/app/` — pages and routes (Next.js App Router)
  - `src/server/` — database, auth/access checks, server actions
- After pulling new changes (`git pull`), run `pnpm install` in case
  dependencies changed.
