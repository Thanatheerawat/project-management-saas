import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { ApiError } from "@/lib/api-client";

import messages from "../../../../messages/en.json";

// useSearchParams needs a Next.js App Router context this plain render()
// doesn't provide — mocked directly, same reasoning ai-breakdown-dialog
// .test.tsx gives for mocking its own hooks rather than standing up the
// real stack for something this suite isn't meant to re-verify.
let mockToken = "valid-token";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockToken ? `token=${mockToken}` : ""),
}));

const mockMutateAsync = vi.fn();
const mockUseResetPassword = vi.fn(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
  isSuccess: false,
}));
vi.mock("@/features/auth/hooks/use-reset-password", () => ({
  useResetPassword: () => mockUseResetPassword(),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ResetPasswordForm />
    </NextIntlClientProvider>,
  );
}

describe("ResetPasswordForm", () => {
  afterEach(() => {
    cleanup();
    mockToken = "valid-token";
    mockMutateAsync.mockReset();
    mockUseResetPassword.mockReset();
    mockUseResetPassword.mockImplementation(() => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
    }));
  });

  it("shows the invalid-link message and no form when there is no token in the URL", () => {
    mockToken = "";
    renderForm();
    expect(screen.getByText("This link is invalid")).toBeInTheDocument();
    expect(screen.queryByLabelText("New Password")).not.toBeInTheDocument();
  });

  it("renders both password fields and a length hint", () => {
    renderForm();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  });

  it("rejects submission client-side when the two passwords don't match, without calling the API", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("submits {token, newPassword} only (no confirmPassword) when the passwords match", async () => {
    mockMutateAsync.mockResolvedValue({ message: "Password reset successfully" });
    renderForm();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledWith({
      token: "valid-token",
      newPassword: "password123",
    });
  });

  it("shows a dedicated success view with a Go to Login action instead of auto-redirecting", () => {
    mockUseResetPassword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: true,
    });
    renderForm();

    expect(
      screen.getByText("Your password has been reset. Sign in with your new password."),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Go to Login" });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("New Password")).not.toBeInTheDocument();
  });

  it.each([
    ["token_expired", "This reset link has expired"],
    ["token_used", "This reset link has already been used"],
    ["invalid_token", "This reset link is invalid or has expired"],
  ])("maps the %s API error code to its own message", async (code, expectedMessage) => {
    mockMutateAsync.mockRejectedValue(
      new ApiError(400, "server message", undefined, code),
    );
    renderForm();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });
  });
});
