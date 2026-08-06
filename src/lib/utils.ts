import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared by every Avatar fallback that identifies a user (issue card
// assignee, issue detail sidebar) — one rule for "name" vs "email" and
// for one-word vs multi-word names, instead of each call site
// reimplementing it slightly differently.
export function getInitials(user: { name: string | null; email: string }) {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
