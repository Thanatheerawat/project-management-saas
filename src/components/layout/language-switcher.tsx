"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/i18n/actions";
import { isLocale, LOCALE_LABEL, LOCALES } from "@/i18n/config";

/**
 * The locale choices themselves, as menu radio items.
 *
 * Split out from the trigger because the mobile UI reuses it inside the
 * account menu's existing dropdown (a dropdown cannot be nested inside
 * another dropdown's item) — this is the same "one behavior, two
 * placements" split UserMenu already uses for its desktop row vs mobile
 * menu, so the two never drift apart.
 *
 * RadioGroup/RadioItem rather than plain items on purpose: Radix gives
 * each row `role="menuitemradio"` with `aria-checked`, so a screen reader
 * announces which language is currently active instead of reading two
 * indistinguishable menu entries.
 */
export function LanguageMenuItems() {
  const locale = useLocale();
  const t = useTranslations("navigation");
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: string) {
    // Radix hands back a plain string; `isLocale` is the same guard the
    // request config uses, so an unexpected value is ignored rather than
    // written to the cookie.
    if (!isLocale(next) || next === locale) return;
    startTransition(() => {
      // The Server Action writes the cookie and revalidates the layout
      // tree, so the chrome re-renders in the new language in place —
      // no sign-out, no navigation, no URL change.
      void setLocale(next);
    });
  }

  return (
    <>
      <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={locale} onValueChange={handleSelect}>
        {LOCALES.map((value) => (
          <DropdownMenuRadioItem key={value} value={value} disabled={isPending}>
            {LOCALE_LABEL[value]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}

/**
 * Desktop control: sits in the navbar actions row next to ThemeToggle and
 * follows its visual language exactly (ghost button, same height) rather
 * than introducing a new kind of control into the M6.5 top bar.
 *
 * It shows the active locale as a two-letter code instead of only an
 * icon, so the current language is readable at a glance without opening
 * the menu. The code is derived from the locale rather than translated —
 * "EN"/"TH" are the same in both languages.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("navigation");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-1.5 md:inline-flex"
          aria-label={`${t("language")}: ${LOCALE_LABEL[locale]}`}
        >
          <Languages className="size-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs font-medium">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
