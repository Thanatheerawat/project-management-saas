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
//
// `/admin` (Milestone 6 Increment 4) follows the identical rule: middleware
// only checks for a session, never PlatformRole. The `getToken` JWT does
// carry `role`, but a role check here would duplicate — and risk drifting
// from — the single source of truth in `app/admin/layout.tsx`
// (`hasRole(role, "ADMIN")`, Decision A2) and every `/api/admin/*` route's
// own `requireRole` call.
const PROTECTED_PREFIXES = ["/profile", "/workspaces", "/w", "/admin"];
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
    // "/workspaces", not "/profile" — same fix as login-form.tsx and
    // verify-email-panel.tsx: an already-authenticated visitor to /login
    // or /register belongs in the actual app, not stranded on a settings
    // page. Only the redirect target changed; the token check itself
    // (this file's actual job) is untouched.
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/workspaces/:path*",
    "/w/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
