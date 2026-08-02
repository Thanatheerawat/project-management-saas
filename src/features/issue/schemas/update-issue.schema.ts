import { z } from "zod";

import { ISSUE_PRIORITIES } from "@/features/issue/schemas/create-issue.schema";
import type { IssueStatus } from "@/generated/prisma/client";

// `satisfies` fails to compile if IssueStatus (schema.prisma) ever
// diverges from this literal list. Declared in enum-declaration order,
// which is also Kanban column order (see
// issueRepository.findManyByProject) — kept here, not exported from
// create-issue.schema.ts, since status isn't settable at creation.
export const ISSUE_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
] as const satisfies readonly IssueStatus[];

// `assigneeId: null` explicitly unassigns; omitting the field entirely
// leaves the current assignee untouched — `.nullable().optional()`
// expresses both states, a plain `.optional()` alone could only express
// "don't change it" vs. "set it to a value," never "clear it." `position`
// is included for a future drag-and-drop increment (Decision Point C,
// deferred) — no UI calls it yet.
export const updateIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  assigneeId: z.uuid().nullable().optional(),
  position: z.number().optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
