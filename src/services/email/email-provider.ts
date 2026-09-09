// Every email provider (Mock, Resend, and any future addition) implements
// this one method — same "one interface, swap the implementation" shape
// as AIProvider (src/services/ai/ai-provider.ts). `body` is plain text,
// matching what every current caller (verification/password-reset emails)
// already sends; providers decide for themselves how to map that onto
// whatever the underlying transport actually wants (e.g. Resend's `text`
// field).
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// Mirrors AIProviderType (src/features/ai/types.ts): a plain string union,
// not imported by env.ts or the factory — env.ts's own
// `z.enum(["mock", "resend"])` is structurally identical, so nothing here
// needs to depend on env parsing to stay type-safe.
export type EmailProviderType = "mock" | "resend";
