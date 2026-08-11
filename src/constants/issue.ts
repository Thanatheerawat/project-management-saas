import type { IssuePriority, IssueStatus } from "@/generated/prisma/client";

// Single source of truth for Kanban status/priority display — reserved
// for exactly this since Foundation (see folder-structure.md: "status
// colors/labels, role hierarchy"), first real use as of Milestone 4.
// Colors are the CSS custom properties already defined in globals.css
// since the Phase 3 UI/UX doc (--color-status-*/--color-priority-*),
// unused in code until now — not re-derived here, just referenced by
// name.
export const ISSUE_STATUS_COLOR: Record<IssueStatus, string> = {
  BACKLOG: "var(--color-status-backlog)",
  TODO: "var(--color-status-todo)",
  IN_PROGRESS: "var(--color-status-in-progress)",
  IN_REVIEW: "var(--color-status-in-review)",
  DONE: "var(--color-status-done)",
  CANCELLED: "var(--color-status-cancelled)",
};

export const ISSUE_PRIORITY_COLOR: Record<IssuePriority, string> = {
  URGENT: "var(--color-priority-urgent)",
  HIGH: "var(--color-priority-high)",
  MEDIUM: "var(--color-priority-medium)",
  LOW: "var(--color-priority-low)",
  NONE: "var(--color-priority-none)",
};

// M6.5 responsive/i18n pass: human-readable labels for the same enum
// values above — the enum values themselves (BACKLOG, IN_PROGRESS, ...)
// remain the wire/DB/data values everywhere (Prisma, API payloads,
// `<option value=...>`, analytics chart category keys); only what a user
// actually reads switches to these. Deliberately NOT applied to the
// analytics charts' axis tick labels — those are also the accessible
// names Playwright's e2e suite hovers by (see
// tests/e2e/analytics-dashboard.spec.ts's readCategoryCount), so changing
// them is a separate, test-touching change outside this pass's scope.
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const ISSUE_PRIORITY_LABEL: Record<IssuePriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  NONE: "None",
};
