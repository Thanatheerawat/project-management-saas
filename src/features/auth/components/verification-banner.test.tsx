import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { ApiError } from "@/lib/api-client";

import messages from "../../../../messages/en.json";

// Same "mock the hooks directly, wrap in NextIntlClientProvider with the
// real messages/en.json" approach ai-breakdown-dialog.test.tsx already
// established — this keeps the test focused on the banner's own
// visibility/cooldown logic, not TanStack Query or the network layer
// (already covered by resend-verification.integration.test.ts).
const mockUseProfile = vi.fn();
vi.mock("@/features/user/hooks/use-profile", () => ({
  useProfile: () => mockUseProfile(),
}));

const mockResendMutateAsync = vi.fn();
const mockUseResendVerification = vi.fn(() => ({
  mutateAsync: mockResendMutateAsync,
  isPending: false,
}));
vi.mock("@/features/auth/hooks/use-resend-verification", () => ({
  useResendVerification: () => mockUseResendVerification(),
}));

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <VerificationBanner />
    </NextIntlClientProvider>,
  );
}

describe("VerificationBanner", () => {
  afterEach(() => {
    cleanup();
    mockUseProfile.mockReset();
    mockResendMutateAsync.mockReset();
    mockUseResendVerification.mockReset();
    mockUseResendVerification.mockImplementation(() => ({
      mutateAsync: mockResendMutateAsync,
      isPending: false,
    }));
  });

  it("renders nothing while the profile is still loading", () => {
    mockUseProfile.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the email is verified", () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      data: { emailVerified: "2026-01-01T00:00:00.000Z" },
    });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the banner with a resend button when the email is unverified", () => {
    mockUseProfile.mockReturnValue({ isLoading: false, data: { emailVerified: null } });
    renderBanner();

    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend verification email" }),
    ).toBeInTheDocument();
  });

  it("shows a success message and disables the button (cooldown) after a successful resend", async () => {
    mockUseProfile.mockReturnValue({ isLoading: false, data: { emailVerified: null } });
    mockResendMutateAsync.mockResolvedValue({ message: "Verification email sent" });
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(screen.getByText("Verification email sent")).toBeInTheDocument();
    });
    expect(mockResendMutateAsync).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /Resend verification email \(\d+s\)/ }),
    ).toBeDisabled();
  });

  it("shows the rate-limit message and disables the button when the server rejects with rate_limited", async () => {
    mockUseProfile.mockReturnValue({ isLoading: false, data: { emailVerified: null } });
    mockResendMutateAsync.mockRejectedValue(
      new ApiError(
        429,
        "Please wait before requesting another verification email",
        undefined,
        "rate_limited",
      ),
    );
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(
        screen.getByText("Please wait before requesting another verification email"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Resend verification email \(\d+s\)/ }),
    ).toBeDisabled();
  });

  it("shows a generic error message and leaves the button enabled for a non-rate-limit failure", async () => {
    mockUseProfile.mockReturnValue({ isLoading: false, data: { emailVerified: null } });
    mockResendMutateAsync.mockRejectedValue(new Error("network down"));
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to send verification email")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Resend verification email" }),
    ).not.toBeDisabled();
  });
});
