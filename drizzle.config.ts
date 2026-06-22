import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit auto-loads `.env` (tracked, placeholders only); our real secrets
// live in `.env.local`. Load it and let it win, matching Next.js precedence.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env.local — fall back to whatever is already in the environment
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
