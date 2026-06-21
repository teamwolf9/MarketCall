import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets at rest (provider API keys). The key comes from
 * APP_ENCRYPTION_KEY (32 bytes, base64) — set once in .env.local, never in the
 * repo. Ciphertext is stored as "iv:tag:data", all base64. GCM authenticates,
 * so tampering is detected on decrypt. This is server-only; keys never reach the
 * browser in either form.
 */
function key(): Buffer {
  const b64 = process.env.APP_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one (32 bytes base64) and add it to .env.local.",
    );
  }
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return k;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed ciphertext.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** A safe-to-display hint of a secret, e.g. "AIza…CklA". Never the full value. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return "••••";
  return `${plaintext.slice(0, 4)}…${plaintext.slice(-4)}`;
}
