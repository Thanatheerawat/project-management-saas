const SINGLE_WORD_KEY_LENGTH = 3;
const MAX_INITIALS = 4;

// Derives a short uppercase issue-key prefix from a project name — e.g.
// "Design System" -> "DS", "Orbit" -> "ORB". Multi-word names take the
// first letter of each word (capped at MAX_INITIALS); a single word takes
// its first few letters instead, since a single initial ("O") would be too
// terse to recognize. Pure and deterministic like slugify() — callers are
// responsible for the uniqueness check the same way slugify()'s callers
// are (see the workspace create route); this does not touch the database.
export function deriveIssueKey(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) return "PRJ";
  if (words.length === 1) return words[0].slice(0, SINGLE_WORD_KEY_LENGTH);

  return words
    .slice(0, MAX_INITIALS)
    .map((word) => word[0])
    .join("");
}
