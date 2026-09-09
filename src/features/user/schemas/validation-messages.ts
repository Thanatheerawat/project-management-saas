import type { useTranslations } from "next-intl";

// Same technique as src/features/auth/schemas/validation-messages.ts,
// duplicated rather than shared across the two namespaces: "profile" and
// "auth" are independent next-intl namespaces (see profile.schema.ts and
// change-password-form.tsx, which live in the "auth" namespace instead
// because password vocabulary already existed there before M8.5).
const PROFILE_VALIDATION_KEYS = new Set([
  "validation.nameRequired",
  "validation.jobTitleTooLong",
  "validation.bioTooLong",
  "validation.locationTooLong",
  "validation.invalidTimezone",
  "validation.invalidWebsite",
]);

type ProfileTranslator = ReturnType<typeof useTranslations<"profile">>;

export function translateValidationMessage(
  t: ProfileTranslator,
  message: string | undefined,
): string {
  if (message === undefined) return t("validation.invalidInput");
  if (PROFILE_VALIDATION_KEYS.has(message)) {
    return t(message as Parameters<ProfileTranslator>[0]);
  }
  return message;
}
