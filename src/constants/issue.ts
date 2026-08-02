import type { IssuePriority, IssueStatus } from "@/generated/prisma/client";

// Single source of truth for Kanban status/priority display — reserved
// for exactly this since Foundation (see folder-structure.md: "status
// colors/labels, role hierarchy"), first real use as of Milestone 4.
// Colors are the CSS custom properties already defined in globals.css
// since the Phase 3 UI/UX doc (--color-status-*/--color-priority-*),
// unused in code until now — not re-derived here, just referenced by
// name. Labels are the plain enum values themselves (no separate
// translation), matching how ProjectStatus has always been displayed
// raw (e.g. "ACTIVE", "ON_HOLD") since Milestone 3.
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
