import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChangePasswordForm } from "@/features/user/components/change-password-form";
import { ApiError } from "@/lib/api-client";

import messages from "../../../../messages/en.json";

// Same "mock the hook directly, wrap in NextIntlClientProvider with the
// real messages/en.json" approach established in M8.2/M8.3
// (verification-banner.test.tsx, reset-password-form.test.tsx) — keeps
// this focused on the form's own client validation/loading/success/error
// states, not TanStack Query or the network layer (already covered by
// change-password.integration.test.ts).
const mockMutateAsync = vi.fn();
const mockUseChangePassword = vi.fn(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
}));
vi.mock("@/features/user/hooks/use-change-password", () => ({
  useChangePassword: () => mockUseChangePassword(),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ChangePasswordForm />
    </NextIntlClientProvider>,
  );
}

function fillAndSubmit(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("Current Password"), {
    target: { value: current },
  });
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: { value: confirm },
  });
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
}

describe("ChangePasswordForm", () => {
  afterEach(() => {
    cleanup();
    mockMutateAsync.mockReset();
    mockUseChangePassword.mockReset();
    mockUseChangePassword.mockImplementation(() => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }));
  });

  it("renders the Password & Security section heading", () => {
    renderForm();
    expect(screen.getByText("Password & Security")).toBeInTheDocument();
    expect(
      screen.getByText("Update the password used to sign in to your account."),
    ).toBeInTheDocument();
  });

  it("renders all three password fields and the requirements checklist under New Password only", () => {
    renderForm();
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
  });

  it("updates the checklist in real time as New Password is typed", () => {
    renderForm();
    const newPasswordInput = screen.getByLabelText("New Password");

    for (const item of screen.getAllByRole("listitem")) {
      expect(item.querySelector("svg")).not.toBeInTheDocument();
    }

    fireEvent.change(newPasswordInput, { target: { value: "Newpassword1" } });

    for (const item of screen.getAllByRole("listitem")) {
      expect(item.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("toggles New Password visibility independently of Current/Confirm Password", () => {
    renderForm();
    const newPasswordInput = screen.getByLabelText("New Password");
    const currentPasswordInput = screen.getByLabelText("Current Password");
    expect(newPasswordInput).toHaveAttribute("type", "password");

    const toggle = within(newPasswordInput.parentElement as HTMLElement).getByRole(
      "button",
    );
    fireEvent.click(toggle);

    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(currentPasswordInput).toHaveAttribute("type", "password");
  });

  it("rejects submission client-side when the new password and confirmation don't match, without calling the API", async () => {
    renderForm();
    fillAndSubmit("current-pass", "Newpassword1", "newpassword2");

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects submission client-side when the new password is shorter than 8 characters, without calling the API", async () => {
    renderForm();
    fillAndSubmit("current-pass", "short", "short");

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("submits {currentPassword, newPassword} only (no confirmPassword) when the new password and confirmation match", async () => {
    mockMutateAsync.mockResolvedValue({ message: "Password changed successfully" });
    renderForm();
    fillAndSubmit("current-pass", "Newpassword1", "Newpassword1");

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledWith({
      currentPassword: "current-pass",
      newPassword: "Newpassword1",
    });
  });

  it("shows the loading label and disables the button while the request is pending", () => {
    mockUseChangePassword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });
    renderForm();
    expect(screen.getByRole("button", { name: "Changing..." })).toBeDisabled();
  });

  it("clears all three fields after a successful change, keeping the form (not a success view) on screen", async () => {
    mockMutateAsync.mockResolvedValue({ message: "Password changed successfully" });
    renderForm();
    fillAndSubmit("current-pass", "Newpassword1", "Newpassword1");

    await waitFor(() => {
      expect(screen.getByLabelText("Current Password")).toHaveValue("");
    });
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm Password")).toHaveValue("");
    // Still the same form, not a dedicated success view (per spec: no
    // sign-out/redirect, user stays on the profile page).
    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  });

  it("shows a specific message when the API rejects the current password as incorrect", async () => {
    mockMutateAsync.mockRejectedValue(
      new ApiError(
        400,
        "Current password is incorrect",
        undefined,
        "current_password_incorrect",
      ),
    );
    renderForm();
    fillAndSubmit("wrong-current", "Newpassword1", "Newpassword1");

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
    });
  });

  it("shows a specific message when the API rejects the new password as unchanged", async () => {
    mockMutateAsync.mockRejectedValue(
      new ApiError(
        400,
        "New password must be different",
        undefined,
        "password_unchanged",
      ),
    );
    renderForm();
    fillAndSubmit("current-pass", "Current-pass1", "Current-pass1");

    await waitFor(() => {
      expect(
        screen.getByText("New password must be different from your current password."),
      ).toBeInTheDocument();
    });
  });

  it("falls back to a generic error message for an unrecognized/server failure", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network down"));
    renderForm();
    fillAndSubmit("current-pass", "Newpassword1", "Newpassword1");

    await waitFor(() => {
      expect(
        screen.getByText("Failed to change password. Please try again."),
      ).toBeInTheDocument();
    });
  });
});
