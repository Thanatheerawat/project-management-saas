import { createHash, randomBytes } from "node:crypto";

// Node's built-in crypto — no new dependency needed for random token
// generation/hashing. Shared by both the password-reset and mock
// email-verification flows so the "generate raw, store hash" pattern
// (docs/security.md, A02) lives in one place.
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
