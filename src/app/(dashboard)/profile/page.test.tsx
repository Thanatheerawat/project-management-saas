import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "./page";

// Composition-only test: no other test file exercises this page.tsx
// directly (this codebase's convention is component-level tests under
// features/*, not app/**/page.tsx), but M8.5 restructured this specific
// page around self-contained sections and the spec calls out
// "Password & Security still renders" as its own regression guard — so
// this stubs every child rather than re-testing their internals (already
// covered by profile-form.test.tsx, change-password-form.test.tsx, and
// security-activity-section.test.tsx respectively). M8.6 adds the
// SecurityActivitySection stub — without it this test would fail for the
// same reason profile-form/change-password-form needed one: it calls
// useTranslations with no NextIntlClientProvider in this plain render().
vi.mock("@/features/user/components/profile-form", () => ({
  ProfileForm: () => <div data-testid="profile-form-stub" />,
}));
vi.mock("@/features/user/components/change-password-form", () => ({
  ChangePasswordForm: () => (
    <div data-testid="change-password-form-stub">Password & Security</div>
  ),
}));
vi.mock("@/features/user/components/security-activity-section", () => ({
  SecurityActivitySection: () => (
    <div data-testid="security-activity-section-stub">Security Activity</div>
  ),
}));

describe("ProfilePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders ProfileForm, the M8.4 Password & Security section, and the M8.6 Security Activity section", () => {
    render(<ProfilePage />);

    expect(screen.getByTestId("profile-form-stub")).toBeInTheDocument();
    expect(screen.getByTestId("change-password-form-stub")).toBeInTheDocument();
    expect(screen.getByText("Password & Security")).toBeInTheDocument();
    expect(screen.getByTestId("security-activity-section-stub")).toBeInTheDocument();
    expect(screen.getByText("Security Activity")).toBeInTheDocument();
  });

  it("still renders the back-to-workspace link", () => {
    render(<ProfilePage />);

    expect(screen.getByRole("link", { name: "← Back to Workspace" })).toHaveAttribute(
      "href",
      "/workspaces",
    );
  });
});
