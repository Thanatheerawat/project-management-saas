import type { Locale } from "@/i18n/config";

// Module augmentation, same technique as next-auth.d.ts next to this
// file: it teaches next-intl the exact shape of our messages so
// `t("navigation.dashboard")` is checked against en.json at compile time.
// A typo in a key, or a key that exists in en.json but is missing from
// th.json, becomes a `pnpm typecheck` failure instead of a blank string
// (or a thrown error) at runtime — the Type Safety requirement for M6.6.
//
// en.json is the reference shape on purpose: English is the default
// locale, so it is the file that must always be complete.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof import("../../messages/en.json");
  }
}
