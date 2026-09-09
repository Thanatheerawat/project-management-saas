import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "@/features/user/components/profile-form";
import type { ProfileResponse } from "@/features/user/hooks/use-profile";
import { getInitials } from "@/lib/utils";

import messages from "../../../../messages/en.json";

// Same "mock the hooks directly, wrap in NextIntlClientProvider with the
// real messages/en.json" approach change-password-form.test.tsx (M8.4)
// established — keeps this focused on ProfileForm's own render/validation/
// save states, not TanStack Query or the network layer (already covered
// by profile.integration.test.ts).
const mockUseProfile = vi.fn();
vi.mock("@/features/user/hooks/use-profile", () => ({
  useProfile: () => mockUseProfile(),
}));

const mockUpdateMutateAsync = vi.fn();
const mockUseUpdateProfile = vi.fn(() => ({
  mutateAsync: mockUpdateMutateAsync,
  isPending: false,
}));
vi.mock("@/features/user/hooks/use-update-profile", () => ({
  useUpdateProfile: () => mockUseUpdateProfile(),
}));

const mockResendMutateAsync = vi.fn();
vi.mock("@/features/auth/hooks/use-resend-verification", () => ({
  useResendVerification: () => ({ mutateAsync: mockResendMutateAsync, isPending: false }),
}));

// sonner isn't mocked anywhere else in this codebase (other forms assert
// DOM state instead), but ProfileForm never swaps to a dedicated success
// view — toast is the only user-visible success signal, so it's the thing
// worth asserting on directly here.
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const baseProfile: ProfileResponse = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
  emailVerified: "2026-01-01T00:00:00.000Z",
  role: "USER",
  jobTitle: "Frontend Developer",
  bio: "I like computers.",
  location: "Bangkok, Thailand",
  timezone: "Asia/Bangkok",
  website: "https://ada.dev",
  createdAt: "2025-01-01T00:00:00.000Z",
  lastLoginAt: "2026-02-02T00:00:00.000Z",
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProfileForm />
    </NextIntlClientProvider>,
  );
}

function setProfile(data: Partial<ProfileResponse>) {
  mockUseProfile.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { ...baseProfile, ...data },
  });
}

describe("ProfileForm", () => {
  afterEach(() => {
    cleanup();
    mockUseProfile.mockReset();
    mockUpdateMutateAsync.mockReset();
    mockUseUpdateProfile.mockReset();
    mockUseUpdateProfile.mockImplementation(() => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }));
    mockResendMutateAsync.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("renders the profile header with the loaded user's data", () => {
    setProfile({});
    renderForm();

    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    // Appears twice by design (header glance + Account Information's
    // canonical row) — see AccountInformationCard's own comment.
    expect(screen.getAllByText("ada@example.com").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Frontend Developer · Bangkok, Thailand"),
    ).toBeInTheDocument();
  });

  it("shows a translated error message when the profile fails to load (M8.7: was hardcoded English, now routed through i18n)", () => {
    mockUseProfile.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    renderForm();

    expect(screen.getByText("Failed to load profile")).toBeInTheDocument();
  });

  it("renders an initials fallback in the avatar when no image is present", () => {
    setProfile({ image: null });
    renderForm();

    expect(screen.getByText(getInitials(baseProfile))).toBeInTheDocument();
  });

  it("renders the job title when present", () => {
    setProfile({ jobTitle: "Backend Engineer", location: null });
    renderForm();

    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
  });

  it("renders the location when present", () => {
    setProfile({ jobTitle: null, location: "Tokyo, Japan" });
    renderForm();

    expect(screen.getByText("Tokyo, Japan")).toBeInTheDocument();
  });

  it("renders gracefully when all optional fields are absent (no header meta line, no website row)", () => {
    setProfile({
      jobTitle: null,
      location: null,
      website: null,
      bio: null,
      timezone: null,
    });
    renderForm();

    expect(screen.queryByText("Frontend Developer")).not.toBeInTheDocument();
    expect(screen.queryByText("Bangkok, Thailand")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ada\.dev/i })).not.toBeInTheDocument();
    // The editable form itself still renders with empty values, not an
    // error state.
    expect(screen.getByLabelText("Job Title")).toHaveValue("");
    expect(screen.getByLabelText("Timezone")).toHaveValue("");
  });

  it("populates every editable field with the loaded profile's existing values", () => {
    setProfile({});
    renderForm();

    expect(screen.getByLabelText("Full Name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Job Title")).toHaveValue("Frontend Developer");
    expect(screen.getByLabelText("Location")).toHaveValue("Bangkok, Thailand");
    expect(screen.getByLabelText("Timezone")).toHaveValue("Asia/Bangkok");
    expect(screen.getByLabelText("Website")).toHaveValue("https://ada.dev");
    expect(screen.getByLabelText("Bio")).toHaveValue("I like computers.");
  });

  it("rejects a bio over 500 characters client-side, without calling the API", async () => {
    setProfile({});
    renderForm();

    fireEvent.change(screen.getByLabelText("Bio"), {
      target: { value: "a".repeat(501) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Bio must be 500 characters or fewer")).toBeInTheDocument();
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid website client-side, without calling the API", async () => {
    setProfile({});
    renderForm();

    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "not-a-valid-url" },
    });
    // fireEvent.submit (not a button click) — the Website input is
    // `type="url"`, and jsdom's own native constraint validation blocks a
    // *click* on the submit button before React's onSubmit ever runs
    // (the same would happen in a real browser), which would only prove
    // the browser's built-in check works, not this component's Zod
    // validation/translated error message.
    fireEvent.submit(
      screen.getByRole("button", { name: "Save Changes" }).closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid website URL (e.g. https://example.com)"),
      ).toBeInTheDocument();
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it("shows the loading label and disables the button while saving", () => {
    setProfile({});
    mockUseUpdateProfile.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: true,
    });
    renderForm();

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("shows a success toast after a successful save", async () => {
    setProfile({});
    mockUpdateMutateAsync.mockResolvedValue({});
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Changes saved"));
  });

  it("keeps the just-saved value in the field after a successful save (no reset/reload)", async () => {
    setProfile({});
    mockUpdateMutateAsync.mockResolvedValue({});
    renderForm();

    fireEvent.change(screen.getByLabelText("Job Title"), {
      target: { value: "Staff Engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitle: "Staff Engineer" }),
    );
    expect(screen.getByLabelText("Job Title")).toHaveValue("Staff Engineer");
  });
});
