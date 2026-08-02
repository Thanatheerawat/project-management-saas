import { z } from "zod";

import type { IssuePriority } from "@/generated/prisma/client";

// Shared with update-issue.schema.ts — kept here since priority is
// settable at both creation and update, unlike status (every new issue
// starts BACKLOG, the Prisma default; see update-issue.schema.ts for
// where ISSUE_STATUSES lives).
export const ISSUE_PRIORITIES = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
] as const satisfies readonly IssuePriority[];

// `status`/`position`/`number` aren't client-settable at creation:
// status is the Prisma default (BACKLOG), position is computed
// server-side (append to the end of that column), and number comes from
// Project.issueCounter (see issueRepository.create). `assigneeId` is
// optional — an issue can be filed unassigned.
export const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  assigneeId: z.uuid().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
