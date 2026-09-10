"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Generic ui/ primitives never import next-intl (see input.tsx/button.tsx)
// — callers pass already-translated labels, same pattern as everywhere
// else in this codebase. The toggle only ever flips the native input's
// `type`; the value itself is never read, logged, or stored here.
export interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  showPasswordLabel: string;
  hidePasswordLabel: string;
}

function PasswordInput({
  className,
  showPasswordLabel,
  hidePasswordLabel,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hidePasswordLabel : showPasswordLabel}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-8 items-center justify-center"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
