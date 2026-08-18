// Single source of truth for which locales exist and how one is stored.
//
// Milestone 6.6 Decision D1: locale lives in a cookie, NOT in the URL —
// there is no `/en` / `/th` path prefix. Routing, the middleware matcher,
// and every auth redirect (`callbackUrl`, `redirect("/login")`) keep
// working on the exact same paths they did in M6.5, and the e2e suite's
// 33 URL assertions stay valid without a single edit. The trade-off is
// that pages reading a translation become dynamically rendered — already
// true for every authenticated page, which calls `auth()` (a cookie read)
// anyway.
export const LOCALES = ["en", "th"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// next-intl's own convention for this cookie name. Reused rather than
// invented so anything that later reads the locale outside our code
// (a Vercel edge config, an analytics tag) sees the expected key.
export const LOCALE_COOKIE = "NEXT_LOCALE";

// One year: the point of the cookie is that a returning visitor is still
// reading the language they picked, so a session-length cookie would
// defeat it. `lax` (not `strict`) so following an external link into the
// app still arrives in the chosen language.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
