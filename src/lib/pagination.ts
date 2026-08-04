const DEFAULT_PAGE_SIZE = 20;

// Decision Point B1 (Milestone 6 proposal): offset/limit pagination with
// a fixed, non-configurable page size — the simplest thing that works,
// not cursor-based, matching this codebase's consistent preference for
// the simplest workable approach over a more scalable one nothing has
// asked for yet. Shared by every admin list endpoint so the parsing rule
// (and its default) lives in exactly one place instead of being
// duplicated across routes.
export function parsePagination(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
