import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// `getToken` (not our `auth()` wrapper) is deliberate here: middleware
// runs on the Edge runtime with a raw NextRequest, not the
// cookies()-based context getServerSession expects.
//
// `/workspaces` and `/w` (Milestone 3) only extend *which paths* require
// a session — the check itself is still just "is there a valid token."
// Whether the caller is actually a member of the specific workspace at
// `/w/[slug]/...` is a DB lookup (resolveWorkspaceMembership), which
// can't happen here: middleware must stay Edge-compatible and query-free.
// That authorization step lives in the Server Component layout for
// `/w/[slug]` (Increment 5) and already lives in every workspace/project
// Route Handler (Increment 3) — this file only ever answers "logged in
// or not."
const PROTECTED_PREFIXES = ["/profile", "/workspaces", "/w"];
const AUTH_PAGES = ["/login", "/register"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/workspaces/:path*", "/w/:path*", "/login", "/register"],
};
