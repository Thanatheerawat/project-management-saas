import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";

import { QueryProvider } from "@/providers/query-provider";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Composes every app-wide provider in one place so root layout stays thin.
 *
 * Milestone 6.6: NextIntlClientProvider sits outermost so *every* Client
 * Component below it can call `useTranslations()` — including the ones
 * rendered inside the other providers (the sonner <Toaster/>'s messages,
 * for one). It reads the locale and messages resolved by
 * `i18n/request.ts` automatically because this is a Server Component;
 * nothing needs to be threaded through props.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </SessionProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
