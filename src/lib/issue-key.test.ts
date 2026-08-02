import { describe, expect, it } from "vitest";

import { deriveIssueKey } from "@/lib/issue-key";

describe("deriveIssueKey", () => {
  it("takes the first letter of each word for a multi-word name", () => {
    expect(deriveIssueKey("Design System")).toBe("DS");
  });

  it("takes the first few letters for a single-word name", () => {
    expect(deriveIssueKey("Orbit")).toBe("ORB");
  });

  it("caps multi-word initials at 4 letters", () => {
    expect(deriveIssueKey("Very Long Project Name Here")).toBe("VLPN");
  });

  it("ignores non-alphanumeric characters when splitting words", () => {
    expect(deriveIssueKey("Design & Growth")).toBe("DG");
  });

  it("falls back to PRJ when there's nothing derivable", () => {
    expect(deriveIssueKey("!!!")).toBe("PRJ");
  });

  it("handles a single short word without padding", () => {
    expect(deriveIssueKey("Q")).toBe("Q");
  });
});
