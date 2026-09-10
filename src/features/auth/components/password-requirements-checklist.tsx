"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { getPasswordRequirementStatus } from "@/features/auth/schemas/password-policy";
import { cn } from "@/lib/utils";

interface PasswordRequirementsChecklistProps {
  password: string;
}

// Real-time policy feedback — re-derives status from the exact same
// regexes password-policy.ts uses for server-side validation (via
// getPasswordRequirementStatus), so this checklist can never disagree
// with what the API will actually accept. Feature-scoped (not
// components/ui/) so it can call useTranslations itself directly, same
// as every other auth-namespace component in this codebase.
export function PasswordRequirementsChecklist({
  password,
}: PasswordRequirementsChecklistProps) {
  const t = useTranslations("auth");
  const status = getPasswordRequirementStatus(password);
  const items = [
    { met: status.minLength, label: t("passwordMinHint") },
    { met: status.hasUppercase, label: t("passwordRequirementUppercase") },
    { met: status.hasLowercase, label: t("passwordRequirementLowercase") },
    { met: status.hasNumber, label: t("passwordRequirementNumber") },
  ];

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            item.met ? "text-accent" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
              item.met ? "border-accent bg-accent" : "border-muted-foreground/40",
            )}
            aria-hidden="true"
          >
            {item.met && (
              <Check className="text-accent-foreground size-2.5" strokeWidth={3} />
            )}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
