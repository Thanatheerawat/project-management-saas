import { describe, expect, it } from "vitest";

import { parsePagination } from "@/lib/pagination";

function params(query: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parsePagination", () => {
  it("defaults to page 1 when no page param is present", () => {
    expect(parsePagination(params())).toEqual({
      page: 1,
      pageSize: 20,
      skip: 0,
      take: 20,
    });
  });

  it("parses a valid positive integer page", () => {
    expect(parsePagination(params({ page: "3" })).page).toBe(3);
  });

  it("computes skip/take from the page number", () => {
    const result = parsePagination(params({ page: "3" }));
    expect(result.skip).toBe(40);
    expect(result.take).toBe(20);
  });

  // Real branching (Number.isInteger(...) && rawPage > 0) — every case
  // below exercises a different way that condition can fail.
  it("falls back to page 1 for a non-numeric page value", () => {
    expect(parsePagination(params({ page: "abc" })).page).toBe(1);
  });

  it("falls back to page 1 for page=0", () => {
    expect(parsePagination(params({ page: "0" })).page).toBe(1);
  });

  it("falls back to page 1 for a negative page", () => {
    expect(parsePagination(params({ page: "-5" })).page).toBe(1);
  });

  it("falls back to page 1 for a non-integer page", () => {
    expect(parsePagination(params({ page: "2.5" })).page).toBe(1);
  });

  it("pageSize is always the fixed default, never configurable via query", () => {
    expect(parsePagination(params({ page: "1", pageSize: "100" })).pageSize).toBe(20);
  });
});
