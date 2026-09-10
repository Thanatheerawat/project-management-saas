import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordInput } from "@/components/ui/password-input";

afterEach(() => {
  cleanup();
});

describe("PasswordInput", () => {
  it("renders masked by default", () => {
    render(
      <PasswordInput
        aria-label="Password"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
        value="secret-value"
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("toggles to plaintext on click, and back to masked on a second click", () => {
    render(
      <PasswordInput
        aria-label="Password"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
        value="secret-value"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });

    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("never renders the password value inside the toggle button itself", () => {
    render(
      <PasswordInput
        aria-label="Password"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
        value="super-secret-value"
        onChange={() => {}}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.textContent).not.toContain("super-secret-value");
  });

  it("forwards other input props (id, autoComplete, required) to the underlying input", () => {
    render(
      <PasswordInput
        id="newPassword"
        autoComplete="new-password"
        required
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
        value=""
        onChange={() => {}}
      />,
    );
    const input = document.getElementById("newPassword");
    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toBeRequired();
  });
});
