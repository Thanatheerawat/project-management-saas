import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "@/config/env";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { verifyPassword } from "@/lib/auth/password";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { userRepository } from "@/repositories/auth/user.repository";

// No PrismaAdapter here on purpose: the Credentials provider + JWT
// session strategy don't need one (the adapter exists to persist
// OAuth accounts/database sessions, neither of which is in play for
// Milestone 2). The Account/Session/VerificationToken tables in
// schema.prisma stay ready for when a real OAuth provider is added.
export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await userRepository.findByEmail(parsed.data.email);

        // Same null return whether the user doesn't exist, has no
        // password set, or is deactivated — never reveal which case it
        // is (see docs/security.md, A04).
        if (!user || !user.isActive || !user.passwordHash) {
          await auditLogRepository.record(
            "LOGIN_FAILED",
            user?.id,
            user ? { reason: "inactive_or_no_password" } : { email: parsed.data.email },
          );
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await auditLogRepository.record("LOGIN_FAILED", user.id, { reason: "locked" });
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          await userRepository.recordLoginFailure(user.id);
          await auditLogRepository.record("LOGIN_FAILED", user.id, {
            reason: "bad_password",
          });
          return null;
        }

        await userRepository.recordLoginSuccess(user.id);
        await auditLogRepository.record("LOGIN_SUCCESS", user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await auditLogRepository.record("LOGOUT", token.id);
      }
    },
  },
};
