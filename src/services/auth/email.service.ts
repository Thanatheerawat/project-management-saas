import { logger } from "@/lib/logger";

interface MockEmail {
  to: string;
  subject: string;
  body: string;
}

// Swap point for a real provider (Resend, etc.) once a milestone actually
// needs delivered email — nothing that calls emailService needs to
// change, only this file's implementation. See docs/security.md and the
// Milestone 2 plan for why this is mocked rather than wired to a real
// provider now.
export const emailService = {
  async send({ to, subject, body }: MockEmail): Promise<void> {
    logger.info("MOCK EMAIL — not actually sent", { to, subject, body });
  },

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Verify your Orbit account",
      body: `Verify your email: ${verifyUrl}`,
    });
  },

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Reset your Orbit password",
      body: `Reset your password: ${resetUrl}`,
    });
  },
};
