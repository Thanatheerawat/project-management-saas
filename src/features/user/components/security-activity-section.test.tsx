import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecurityActivitySection } from "@/features/user/components/security-activity-section";
import type { SecurityActivityEvent } from "@/features/user/hooks/use-security-activity";

import messages from "../../../../messages/en.json";
import thMessages from "../../../../messages/th.json";

// Same "mock the hook directly, wrap in NextIntlClientProvider with the
// real messages" approach as profile-form.test.tsx/change-password-form
// .test.tsx.
const mockUseSecurityActivity = vi.fn();
vi.mock("@/features/user/hooks/use-security-activity", () => ({
  useSecurityActivity: () => mockUseSecurityActivity(),
}));

function renderSection(locale: "en" | "th" = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? messages : thMessages}
    >
      <SecurityActivitySection />
    </NextIntlClientProvider>,
  );
}

const sampleEvents: SecurityActivityEvent[] = [
  { id: "evt-1", action: "PASSWORD_CHANGED", occurredAt: "2026-09-08T18:42:00.000Z" },
  { id: "evt-2", action: "LOGIN_SUCCESS", occurredAt: "2026-09-07T10:00:00.000Z" },
];

describe("SecurityActivitySection", () => {
  afterEach(() => {
    cleanup();
    mockUseSecurityActivity.mockReset();
  });

  it("renders the section heading", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { events: [] },
    });
    renderSection();

    expect(screen.getByText("Security Activity")).toBeInTheDocument();
    expect(screen.getByText("Recent account and sign-in activity.")).toBeInTheDocument();
  });

  it("shows a loading skeleton while fetching", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });
    const { container } = renderSection();

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(
      0,
    );
  });

  it("shows an error message when the request fails", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });
    renderSection();

    expect(screen.getByText("Failed to load security activity.")).toBeInTheDocument();
  });

  it("shows a concise empty state and no fake events when there is no activity", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { events: [] },
    });
    renderSection();

    expect(screen.getByText("No recent security activity.")).toBeInTheDocument();
  });

  it("renders each event with its translated label, description, and a formatted timestamp", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { events: sampleEvents },
    });
    renderSection();

    expect(screen.getByText("Password changed")).toBeInTheDocument();
    expect(screen.getByText("Your account password was changed.")).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.getByText("You signed in to your account.")).toBeInTheDocument();
    // Computed rather than hardcoded — the component formats in the
    // runner's local timezone (Date.prototype.toLocaleDateString/
    // toLocaleTimeString with no explicit `timeZone`, same as every other
    // timestamp in this codebase), so a literal string would be wrong on
    // any machine/CI runner not in this repo's own timezone.
    const expected = new Date(sampleEvents[0]!.occurredAt);
    const expectedDate = expected.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const expectedTime = expected.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(screen.getByText(`${expectedDate} · ${expectedTime}`)).toBeInTheDocument();
  });

  it("renders correctly in Thai", () => {
    mockUseSecurityActivity.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { events: [sampleEvents[0]] },
    });
    renderSection("th");

    expect(screen.getByText("กิจกรรมความปลอดภัย")).toBeInTheDocument();
    expect(screen.getByText("เปลี่ยนรหัสผ่านแล้ว")).toBeInTheDocument();
    expect(screen.getByText("รหัสผ่านบัญชีของคุณถูกเปลี่ยน")).toBeInTheDocument();
  });
});
