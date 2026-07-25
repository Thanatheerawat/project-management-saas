import { NextResponse } from "next/server";

/**
 * Pass-through only. Auth/RBAC/redirect logic is intentionally deferred
 * to the Authentication milestone — this file exists now purely to
 * establish the convention and location Next.js requires.
 */
export function middleware() {
  return NextResponse.next();
}
