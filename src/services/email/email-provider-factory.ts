import type { EmailProvider, EmailProviderType } from "@/services/email/email-provider";
import { MockEmailProvider } from "@/services/email/mock-email-provider";
import { ResendEmailProvider } from "@/services/email/resend-email-provider";

// Provider-specific config the factory threads through without ever
// reading it itself — mirrors AIProviderConfig
// (src/services/ai/ai-provider-factory.ts) exactly, including the reason:
// keeps this file free of any env.ts dependency, so it stays trivially
// unit-testable with zero setup.
export interface EmailProviderConfig {
  resendApiKey?: string;
  emailFrom?: string;
}

// Single swap point for which EmailProvider implementation is active.
// Takes an explicit type (and, for Resend, explicit credentials) rather
// than reading env.EMAIL_PROVIDER/env.RESEND_API_KEY/env.EMAIL_FROM
// itself — email.service.ts is the one place that resolves those and
// calls this factory, same division of responsibility as the M7 AI
// breakdown Route Handler resolving env.AI_PROVIDER/env.GROQ_API_KEY
// before calling createAIProvider(). Missing/empty credentials are not
// validated here — ResendEmailProvider's own constructor rejects them, so
// there's exactly one place that check lives.
export function createEmailProvider(
  type: EmailProviderType,
  config: EmailProviderConfig = {},
): EmailProvider {
  if (type === "mock") {
    return new MockEmailProvider();
  }

  if (type === "resend") {
    return new ResendEmailProvider(config.resendApiKey ?? "", config.emailFrom ?? "");
  }

  const exhaustiveCheck: never = type;
  throw new Error(`Unknown email provider: ${exhaustiveCheck}`);
}
