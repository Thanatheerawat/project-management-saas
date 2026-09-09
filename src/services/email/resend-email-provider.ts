import { Resend } from "resend";

import type { EmailMessage, EmailProvider } from "@/services/email/email-provider";

// Real Resend integration behind the EmailProvider interface
// (email-provider.ts) — implements the exact same one method as
// MockEmailProvider, so the factory and email.service.ts never need to
// know which concrete provider is active. Receives the API key and from
// address explicitly via the constructor rather than reading
// env.RESEND_API_KEY/env.EMAIL_FROM itself — same reasoning as
// GroqAIProvider (src/services/ai/groq-ai-provider.ts): this class stays
// reachable from a plain unit test without pulling in env.ts's eager
// DATABASE_URL/NEXTAUTH_SECRET validation.
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    if (!apiKey) {
      throw new Error("ResendEmailProvider requires a non-empty API key");
    }
    if (!from) {
      throw new Error("ResendEmailProvider requires a non-empty from address");
    }
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send({ to, subject, body }: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject,
      text: body,
    });

    // Only the error's `name` (a fixed, non-sensitive enum — e.g.
    // "invalid_api_key", "rate_limit_exceeded") and `statusCode` ever
    // propagate — never `error.message` (which could echo back
    // request-shaped detail) and never the API key itself. Same
    // "status/code only, never the raw body" posture as GroqAIProvider's
    // own failure path.
    if (error) {
      throw new Error(
        `Resend request failed: ${error.name} (status ${error.statusCode ?? "unknown"})`,
      );
    }
  }
}
