import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

import messages from "../../../../messages/en.json";

// Same "mock the hook directly, wrap in NextIntlClientProvider with the
// real messages/en.json" approach established in M8.2
// (verification-banner.test.tsx) — keeps this focused on the form's own
// loading/success/error states, not TanStack Query or the network layer
// (already covered by forgot-password.integration.test.ts).
const mockMutateAsync = vi.fn();
const mockUseForgotPassword = vi.fn(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
  isSuccess: false,
}));
vi.mock("@/features/auth/hooks/use-forgot-password", () => ({
  useForgotPassword: () => mockUseForgotPassword(),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ForgotPasswordForm />
    </NextIntlClientProvider>,
  );
}

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    cleanup();
    mockMutateAsync.mockReset();
    mockUseForgotPassword.mockReset();
    mockUseForgotPassword.mockImplementation(() => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
    }));
  });

  it("renders the email input and submit button", () => {
    renderForm();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reset Link" })).toBeInTheDocument();
  });

  it("shows the loading label while the request is pending", () => {
    mockUseForgotPassword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isSuccess: false,
    });
    renderForm();
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
  });

  it("shows the generic success message after a successful submission, hiding the form", async () => {
    mockUseForgotPassword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: true,
    });
    renderForm();

    expect(
      screen.getByText(
        "If an account exists for this email, we've sent a password reset link.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows a persistent inline error (not just a toast) when the request fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network down"));
    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("Request failed, please try again")).toBeInTheDocument();
    });
  });
});
