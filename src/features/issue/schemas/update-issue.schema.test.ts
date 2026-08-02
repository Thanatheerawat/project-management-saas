import { describe, expect, it } from "vitest";

import { updateIssueSchema } from "@/features/issue/schemas/update-issue.schema";

const VALID_UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("updateIssueSchema", () => {
  // The property the repository layer depends on: omitting the key must
  // be distinguishable from explicitly setting it to null, so
  // issueRepository.update() can tell "don't touch the assignee" apart
  // from "unassign this issue."
  it("leaves assigneeId absent from the parsed result when the field is omitted", () => {
    const result = updateIssueSchema.safeParse({ title: "Fix bug" });
    expect(result.success).toBe(true);
    if (result.success) expect(Object.hasOwn(result.data, "assigneeId")).toBe(false);
  });

  it("keeps assigneeId as an explicit null when the field is set to null (unassign)", () => {
    const result = updateIssueSchema.safeParse({ assigneeId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.hasOwn(result.data, "assigneeId")).toBe(true);
      expect(result.data.assigneeId).toBeNull();
    }
  });

  it("accepts a valid uuid for assigneeId (reassign)", () => {
    const result = updateIssueSchema.safeParse({ assigneeId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.assigneeId).toBe(VALID_UUID);
  });

  it("rejects a non-uuid, non-null assigneeId", () => {
    const result = updateIssueSchema.safeParse({ assigneeId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts every IssueStatus value", () => {
    for (const status of [
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "DONE",
      "CANCELLED",
    ]) {
      expect(updateIssueSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects a status value that isn't a real IssueStatus", () => {
    const result = updateIssueSchema.safeParse({ status: "DONE_DONE" });
    expect(result.success).toBe(false);
  });

  it("accepts every IssuePriority value", () => {
    for (const priority of ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]) {
      expect(updateIssueSchema.safeParse({ priority }).success).toBe(true);
    }
  });

  it("rejects an empty title when title is provided", () => {
    const result = updateIssueSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
