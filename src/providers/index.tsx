import { Toaster } from "sonner";

import { QueryProvider } from "@/providers/query-provider";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Composes every app-wide provider in one place so root layout stays thin.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
