import { env } from "@/config/env";
import type { EmailMessage, EmailProvider } from "@/services/email/email-provider";
import { createEmailProvider } from "@/services/email/email-provider-factory";

// M8 incident follow-up: NODE_ENV=production must never silently resolve
// to MockEmailProvider — that provider only logs the message (including
// the raw verification/reset URL, i.e. the raw token) instead of sending
// it, which in production means password-reset and email-verification
// tokens would end up in server logs rather than ever reaching the user.
// Constructing this guard is always safe (no throw); only calling send()
// throws, and only when actually reached — so a misconfigured production
// deploy fails loudly per email attempt instead of crashing every route
// that imports this module at cold start. The message names only which
// env vars are missing, never a value.
class ProductionMockGuardProvider implements EmailProvider {
  async send(): Promise<void> {
    throw new Error(
      "Email provider misconfigured: EMAIL_PROVIDER=mock is not permitted when " +
        "NODE_ENV=production. Set EMAIL_PROVIDER=resend with RESEND_API_KEY and " +
        "EMAIL_FROM configured.",
    );
  }
}

// M8.1: the actual swap point is now createEmailProvider() — this module
// is the one place (analogous to the M7 AI breakdown Route Handler
// resolving env.AI_PROVIDER/env.GROQ_API_KEY) that reads
// env.EMAIL_PROVIDER/env.RESEND_API_KEY/env.EMAIL_FROM and turns them
// into a concrete provider. Resolved once at module load, not per call —
// provider construction is cheap and stateless, and `env` itself is
// already eagerly validated at import time the same way (src/config/
// env.ts). Every existing caller (register/forgot-password routes) keeps
// using exactly the same public API as before; none of them know or care
// which provider is active.
const provider: EmailProvider =
  env.NODE_ENV === "production" && env.EMAIL_PROVIDER === "mock"
    ? new ProductionMockGuardProvider()
    : createEmailProvider(env.EMAIL_PROVIDER, {
        resendApiKey: env.RESEND_API_KEY,
        emailFrom: env.EMAIL_FROM,
      });

export const emailService = {
  async send(message: EmailMessage): Promise<void> {
    await provider.send(message);
  },

  // M8.2: content only — subject/body text, still plain text through the
  // same EmailMessage shape every provider already implements. No
  // template engine, no new library; this is exactly the kind of change
  // the provider abstraction (M8.1) was built to absorb without any
  // caller (register route, resend-verification route) needing to change.
  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Verify your Orbit account",
      body: [
        "Welcome to Orbit!",
        "",
        "Please confirm this is your email address to finish setting up your account:",
        "",
        verifyUrl,
        "",
        "This link expires in 24 hours.",
        "",
        "If you didn't create an Orbit account, you can safely ignore this email.",
      ].join("\n"),
    });
  },

  // M8.3: content only, same reasoning as sendVerificationEmail above —
  // no change to the provider abstraction, no new library. "1 hour"
  // matches RESET_TOKEN_TTL_MS in forgot-password/route.ts exactly (that
  // constant isn't imported here since it's local to that route, not
  // exported — this is a plain-text restatement of the same fixed value,
  // not a second source of truth for any actual expiry check).
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Reset your Orbit password",
      body: [
        "We received a request to reset the password for your Orbit account.",
        "",
        "Reset your password:",
        resetUrl,
        "",
        "This link expires in 1 hour.",
        "",
        "If you didn't request this, you can safely ignore this email — your password will not be changed.",
      ].join("\n"),
    });
  },

  // Workspace invitation: content only, same reasoning as the two methods
  // above — no provider-abstraction change, no template engine. "7 days"
  // is a plain-text restatement of WORKSPACE_INVITATION_TTL_MS
  // (workspace-invitation.repository.ts), not a second source of truth
  // for any actual expiry check (the repository/route own that).
  async sendWorkspaceInvitationEmail(
    to: string,
    details: { workspaceName: string; inviterName: string; acceptUrl: string },
  ): Promise<void> {
    await this.send({
      to,
      subject: `You've been invited to join ${details.workspaceName} on Orbit`,
      body: [
        `${details.inviterName} has invited you to join the "${details.workspaceName}" workspace on Orbit.`,
        "",
        "Accept the invitation:",
        details.acceptUrl,
        "",
        "This link expires in 7 days.",
        "",
        "If you weren't expecting this invitation, you can safely ignore this email.",
      ].join("\n"),
    });
  },
};
