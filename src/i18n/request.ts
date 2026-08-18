import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/config";

// Resolves the active locale once per request. Registered via
// `createNextIntlPlugin()` in next.config.ts, which is what makes
// `getTranslations()` (Server Components) and `getLocale()` work without
// every layout/page passing a locale down by hand.
//
// Cookie-only on purpose: no `Accept-Language` negotiation in this
// increment. Auto-detecting from the browser header would mean a user who
// has never chosen a language gets a different UI depending on their OS,
// which makes "English is the default locale" untrue in practice — and
// makes the e2e suite's default rendering depend on the CI runner's
// locale header. An explicit opt-in via the switcher (Increment 2)
// writing this cookie is the only way the locale ever changes.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
