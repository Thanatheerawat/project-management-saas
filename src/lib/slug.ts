import { randomBytes } from "node:crypto";

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;

// Turns a workspace name into a URL-safe slug matching
// workspaceSlugSchema's format exactly (lowercase, hyphen-separated, no
// leading/trailing/double hyphens). Falls back to a short random suffix
// when the name has too few sluggable characters on its own (e.g. "!!!"
// or a single emoji) — reuses node:crypto (already a dependency via
// tokens.ts) rather than adding a slug-generation library.
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  if (base.length >= MIN_SLUG_LENGTH) return base;

  const suffix = randomBytes(4).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}
