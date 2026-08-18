import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Thai } from "next/font/google";
import { getLocale } from "next-intl/server";

import { AppProviders } from "@/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Milestone 6.6: Inter carries no Thai glyphs at all, so before this the
// Thai locale would have fallen through to whatever the OS happened to
// provide (Segoe UI on Windows, something else everywhere else) — a
// different look per machine and different metrics from the M6.5 design.
// Loaded with the `thai` subset only: Latin text keeps rendering in Inter
// because Inter still comes first in the stack (see globals.css), so the
// English typography approved in M6.5 is byte-for-byte unchanged. The
// variable-weight axis matches Inter's usage here (400-700 in the UI).
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "Orbit",
  description: "Project & issue tracker for software teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Drives <html lang>, which is what screen readers and the browser's
  // own hyphenation/line-breaking use to pick a language — Thai line
  // breaking in particular depends on it.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
