import { z } from "zod";

import { SUPPORTED_TIMEZONES } from "@/constants/timezone";

// A controlled input's "cleared" state (user selects-all-and-deletes) is an
// empty string, but every one of these columns is nullable and means "not
// set" via null, not "". Preprocessing collapses trimmed-empty input to
// null before the inner schema ever sees it, so PersonalInformationForm
// never has to special-case "" itself — the same schema handles both a
// freshly-cleared field and one that was already null.
function nullableTrimmedText(max: number, tooLongMessage: string) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max, tooLongMessage).nullable().optional());
}

// Messages are translation keys — see validation-messages.ts, same
// "stable identifier -> t(key)" technique as the auth schemas'.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "validation.nameRequired").max(100).optional(),
  image: z.url().optional(),
  jobTitle: nullableTrimmedText(100, "validation.jobTitleTooLong"),
  bio: nullableTrimmedText(500, "validation.bioTooLong"),
  location: nullableTrimmedText(100, "validation.locationTooLong"),
  // Canonical IANA identifiers only (src/constants/timezone.ts) — never an
  // arbitrary label. refine() only runs against the string branch: a null
  // input matches the `.nullable()` branch directly and skips it.
  timezone: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .refine(
        (value) => (SUPPORTED_TIMEZONES as readonly string[]).includes(value),
        "validation.invalidTimezone",
      )
      .nullable()
      .optional(),
  ),
  website: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.url("validation.invalidWebsite").nullable().optional()),
});

export type ProfileInput = z.infer<typeof profileSchema>;
