import bcrypt from "bcryptjs";

// Cost factor 12 — see docs/security.md (A02) and ADR for the
// bcryptjs-over-native-bcrypt/argon2 reasoning (serverless portability).
const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
