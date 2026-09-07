import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIBreakdownDialog } from "@/features/ai/components/ai-breakdown-dialog";

// First component-level test in this codebase — @testing-library/react is
// an installed dependency but unused elsewhere, so there's no existing
// convention to follow for mocking hooks in a rendered component. Rather
// than exercise the real useMutation/apiClient/fetch stack (already
// covered at the hook level by use-create-issue's own precedent and the
// AI route's integration tests), both hooks are mocked directly — this
// keeps these tests focused on what's actually new in Checkpoint B: the
// Apply orchestration (which drafts get sent, sequential ordering,
// partial-failure bookkeeping, duplicate-submission guarding), not
// re-verifying TanStack Query or the network layer.
const mockBreakdownMutateAsync = vi.fn();
vi.mock("@/features/ai/hooks/use-ai-breakdown", () => ({
  useAIBreakdown: () => ({
    mutateAsync: mockBreakdownMutateAsync,
    isPending: false,
  }),
}));

const mockCreateIssueMutateAsync = vi.fn();
vi.mock("@/features/issue/hooks/use-create-issue", () => ({
  useCreateIssue: () => ({
    mutateAsync: mockCreateIssueMutateAsync,
    isPending: false,
  }),
}));

const DRAFT_TASKS = [{ title: "Task A" }, { title: "Task B" }, { title: "Task C" }];

async function renderGenerated(tasks = DRAFT_TASKS) {
  mockBreakdownMutateAsync.mockResolvedValueOnce({
    jobId: "job-1",
    status: "SUCCEEDED",
    tasks,
  });

  render(<AIBreakdownDialog projectId="project-1" workspaceId="workspace-1" />);
  fireEvent.click(screen.getByRole("button", { name: "AI Breakdown" }));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Build a login page" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

  await waitFor(() => {
    expect(screen.getByText(tasks[0].title)).toBeInTheDocument();
  });
}

function applyButton() {
  return screen.getByRole("button", { name: /Add.*Issue|Adding/ });
}

describe("AIBreakdownDialog — Apply (M7 Increment 4 Checkpoint B)", () => {
  afterEach(() => {
    // vitest.setup.ts doesn't register RTL's auto-cleanup (nothing has
    // needed it until this file) — explicit here so each test starts
    // from an empty DOM instead of accumulating dialogs across tests.
    cleanup();
    mockBreakdownMutateAsync.mockReset();
    mockCreateIssueMutateAsync.mockReset();
  });

  it("keeps Apply disabled and sends no Issue request when every task is deselected", async () => {
    await renderGenerated();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }

    expect(applyButton()).toBeDisabled();
    fireEvent.click(applyButton());
    expect(mockCreateIssueMutateAsync).not.toHaveBeenCalled();
  });

  it("sends exactly one Issue request when only one task is selected", async () => {
    mockCreateIssueMutateAsync.mockResolvedValue({ id: "issue-1" });
    await renderGenerated();
    const checkboxes = screen.getAllByRole("checkbox");
    // Deselect the other two, leaving only the first selected.
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    fireEvent.click(applyButton());

    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockCreateIssueMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Task A" }),
    );
  });

  it("sends a request only for selected drafts, never for deselected ones", async () => {
    mockCreateIssueMutateAsync.mockResolvedValue({ id: "issue-1" });
    await renderGenerated();
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // deselect Task B only

    fireEvent.click(applyButton());

    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(2));
    const sentTitles = mockCreateIssueMutateAsync.mock.calls.map((call) => call[0].title);
    expect(sentTitles).toEqual(["Task A", "Task C"]);
  });

  it("on full success, shows every task as created and the dialog resets", async () => {
    mockCreateIssueMutateAsync.mockResolvedValue({ id: "issue-1" });
    await renderGenerated();

    fireEvent.click(applyButton());

    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(3));
    // Dialog closes and resets on full success — its trigger button
    // returns, the generated task list is gone.
    await waitFor(() => {
      expect(screen.queryByText("Task A")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "AI Breakdown" })).toBeInTheDocument();
  });

  it("reports a partial failure (one of three fails) instead of claiming full success", async () => {
    mockCreateIssueMutateAsync
      .mockResolvedValueOnce({ id: "issue-1" }) // Task A
      .mockRejectedValueOnce(new Error("failed")) // Task B
      .mockResolvedValueOnce({ id: "issue-3" }); // Task C
    await renderGenerated();

    fireEvent.click(applyButton());

    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(3));
    // Dialog stays open on partial failure — the trigger button is not
    // what's shown; the generated list (still mounted) is. Task A and
    // Task C both succeeded, Task B failed — two "created" badges, one
    // "failed" marker.
    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getAllByText("Created")).toHaveLength(2);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("on retry after a partial failure, does not recreate already-succeeded drafts", async () => {
    mockCreateIssueMutateAsync
      .mockResolvedValueOnce({ id: "issue-1" }) // Task A succeeds
      .mockRejectedValueOnce(new Error("failed")) // Task B fails
      .mockResolvedValueOnce({ id: "issue-3" }); // Task C succeeds
    await renderGenerated();

    fireEvent.click(applyButton());
    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(3));
    mockCreateIssueMutateAsync.mockClear();

    // Retry — only Task B (the failed one) should be attempted this time.
    mockCreateIssueMutateAsync.mockResolvedValueOnce({ id: "issue-2-retry" });
    fireEvent.click(applyButton());

    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockCreateIssueMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Task B" }),
    );
  });

  it("cannot be submitted twice concurrently (a second click while applying is a no-op)", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockCreateIssueMutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    await renderGenerated([{ title: "Task A" }]);

    fireEvent.click(applyButton());
    // Button is now mid-flight (isApplying=true) — a second click must
    // not start a second overlapping batch.
    fireEvent.click(applyButton());
    fireEvent.click(applyButton());

    resolveFirst({ id: "issue-1" });
    await waitFor(() => expect(mockCreateIssueMutateAsync).toHaveBeenCalledTimes(1));
  });
});
