"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  isLocale,
  type Locale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/i18n/config";

/**
 * Persists the visitor's language choice and re-renders the current tree
 * in the new locale.
 *
 * A Server Action rather than a client-side `document.cookie` write: the
 * locale is read server-side in `i18n/request.ts`, so the very next render
 * has to already see the new value. Writing it from the client would need
 * a round trip anyway, and `httpOnly` stays available this way.
 *
 * `revalidatePath("/", "layout")` invalidates the whole tree rather than
 * one route because translated chrome (navbar, sidebar, user menu) is
 * rendered by layouts shared across every page — refreshing only the
 * current path would leave cached parent layouts in the previous
 * language. No `redirect()`: the caller stays exactly where it is, which
 * is the "don't lose current page state" requirement.
 *
 * Wired to the language switcher UI in Increment 2 — this increment only
 * establishes the mechanism.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    // Defensive: Server Actions accept whatever the client sends, so the
    // union type alone is not a runtime guarantee.
    throw new Error(`Unsupported locale: ${String(locale)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
