import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth.config";

// Thin wrapper so the rest of the app calls `auth()` without depending
// directly on NextAuth v4's `getServerSession` API — if this project ever
// upgrades to Auth.js v5's unified `auth()` helper, only this file changes.
export function auth() {
  return getServerSession(authOptions);
}
