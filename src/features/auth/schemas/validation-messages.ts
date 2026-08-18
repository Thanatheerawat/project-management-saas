import type { useTranslations } from "next-intl";

// Every auth schema's custom `.min(...)` message is set to one of these
// keys, relative to the `auth` namespace (see login.schema.ts,
// register.schema.ts, reset-password.schema.ts, verify-email.schema.ts)
// instead of literal English text — the same "stable identifier -> t(key)"
// shape already used for API error codes (ApiError.code). `z.email()`'s
// own built-in message is deliberately left untouched (M6.6 Increment 3B
// decision), so it is never one of these keys.
//
// A form can't tell a Zod issue's `message` apart from arbitrary text by
// looking at it alone, so `translateValidationMessage` checks membership
// in this set first: a recognized key gets translated, anything else
// (Zod's own default English text, most commonly from `z.email()`) is
// shown exactly as Zod produced it, per the decision to leave that
// message unchanged.
const AUTH_VALIDATION_KEYS = new Set([
  "validation.passwordRequired",
  "validation.nameRequired",
  "validation.passwordMin8",
  "validation.tokenRequired",
]);

// Every real caller passes `useTranslations("auth")`'s return value —
// typed against that concrete instantiation (rather than a hand-rolled
// `(key: string) => string`) so the guarded cast below is the only place
// that loses next-intl's compile-time key checking, not the whole
// function signature.
type AuthTranslator = ReturnType<typeof useTranslations<"auth">>;

export function translateValidationMessage(
  t: AuthTranslator,
  message: string | undefined,
): string {
  if (message === undefined) return t("validation.invalidInput");
  if (AUTH_VALIDATION_KEYS.has(message)) {
    return t(message as Parameters<AuthTranslator>[0]);
  }
  return message;
}
