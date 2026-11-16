"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Both icons are always rendered and CSS picks one from the `.dark` class
// next-themes puts on <html> before hydration. Choosing the icon from
// `resolvedTheme` in render caused a hydration mismatch (#418) whenever
// the stored theme was dark: the client's first render already knew the
// theme, the server's HTML did not. The `[.dark_&]` variant is used
// instead of `dark:` because this project's `dark:` follows the OS
// preference, not the class.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("common");
  const label = t("toggleTheme");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden size-4 [.dark_&]:block" />
          <Moon className="block size-4 [.dark_&]:hidden" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
