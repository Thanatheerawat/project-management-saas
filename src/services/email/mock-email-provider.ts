import { logger } from "@/lib/logger";
import type { EmailMessage, EmailProvider } from "@/services/email/email-provider";

// Deterministic, offline stand-in for a real email provider — no network
// call, no API key required. Used for local development, tests, and
// EMAIL_PROVIDER=mock. Behavior preserved exactly from the previous
// hardcoded emailService.send(): log the message and resolve, nothing
// else. The logged `body` includes the raw verification/reset URL (and
// therefore the raw token) — acceptable because this only ever runs in
// mock mode (never in production, where EMAIL_PROVIDER=resend is
// required), the same trade-off the original implementation already made.
export class MockEmailProvider implements EmailProvider {
  async send({ to, subject, body }: EmailMessage): Promise<void> {
    logger.info("MOCK EMAIL — not actually sent", { to, subject, body });
  }
}
