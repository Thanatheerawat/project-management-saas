import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth/auth.config";

// Serves every Auth.js built-in endpoint (callback/credentials, session,
// signout, csrf, ...) — including GET /api/auth/session from the
// Milestone 2 API design. None of these are hand-written route handlers.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
