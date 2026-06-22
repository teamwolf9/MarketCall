#!/usr/bin/env node
// Prompts for your Supabase DB password (hidden) and writes DATABASE_URL into
// .env.local — so the secret never goes through chat. Run: node scripts/set-db-url.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const REF = "twnansydzpimzskbgunw";
const HOST = "aws-1-us-west-2.pooler.supabase.com";
const PORT = "6543"; // transaction pooler
const ENV = new URL("../.env.local", import.meta.url).pathname;

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(prompt);
    const isTTY = stdin.isTTY;
    if (isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let buf = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\n" || ch === "\r" || ch === "") {
          if (isTTY) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          return resolve(buf);
        } else if (ch === "") { // Ctrl-C
          if (isTTY) stdin.setRawMode(false);
          stdout.write("\n");
          return reject(new Error("cancelled"));
        } else if (ch === "" || ch === "\b") { // backspace
          buf = buf.slice(0, -1);
        } else {
          buf += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

let pw;
try {
  pw = (await askHidden("Supabase DB password: ")).trim();
} catch {
  console.error("Cancelled.");
  process.exit(1);
}
if (!pw) {
  console.error("No password entered. Aborting.");
  process.exit(1);
}

const url = `postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${HOST}:${PORT}/postgres`;

let env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const line = `DATABASE_URL=${url}`;
if (/^DATABASE_URL=.*$/m.test(env)) {
  env = env.replace(/^DATABASE_URL=.*$/m, line);
} else {
  env += (env === "" || env.endsWith("\n") ? "" : "\n") + line + "\n";
}
writeFileSync(ENV, env);
console.log(`✓ DATABASE_URL written to .env.local (host=${HOST}:${PORT}, password URL-encoded)`);
