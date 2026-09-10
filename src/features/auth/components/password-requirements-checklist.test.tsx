import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordRequirementsChecklist } from "@/features/auth/components/password-requirements-checklist";

import messages from "../../../../messages/en.json";

function renderChecklist(password: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PasswordRequirementsChecklist password={password} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("PasswordRequirementsChecklist", () => {
  it("renders all four requirement labels", () => {
    renderChecklist("");
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
  });

  it("shows every requirement as unmet (no checkmark icon) for an empty password", () => {
    renderChecklist("");
    for (const item of screen.getAllByRole("listitem")) {
      expect(item.querySelector("svg")).not.toBeInTheDocument();
    }
  });

  it("shows every requirement as met (checkmark icon rendered) for a fully compliant password", () => {
    renderChecklist("Password123");
    for (const item of screen.getAllByRole("listitem")) {
      expect(item.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("shows a mix of met/unmet requirements for a partially compliant password", () => {
    renderChecklist("alllowercase1");
    const items = screen.getAllByRole("listitem");
    const lengthItem = items.find((i) => i.textContent === "At least 8 characters");
    const uppercaseItem = items.find((i) => i.textContent === "One uppercase letter");
    const lowercaseItem = items.find((i) => i.textContent === "One lowercase letter");
    const numberItem = items.find((i) => i.textContent === "One number");

    expect(lengthItem?.querySelector("svg")).toBeInTheDocument();
    expect(uppercaseItem?.querySelector("svg")).not.toBeInTheDocument();
    expect(lowercaseItem?.querySelector("svg")).toBeInTheDocument();
    expect(numberItem?.querySelector("svg")).toBeInTheDocument();
  });
});
