import { z } from "zod";

import { ISSUE_PRIORITIES } from "@/features/issue/schemas/create-issue.schema";

// Hard ceiling on how many draft tasks a single AI breakdown can produce —
// guards against a malformed/malicious provider response trying to flood
// the review UI or the eventual "apply to board" write path with an
// unbounded number of issues.
export const MAX_TASKS_PER_BREAKDOWN = 20;

// Every field an AI provider (Mock or Groq) is allowed to produce for one
// draft task. `.strict()` rejects any extra/unexpected key instead of
// silently dropping it — untrusted provider output should fail loudly on a
// shape mismatch, not get quietly reshaped. Field limits match
// createIssueSchema exactly, since a draft task becomes a real Issue.
export const draftTaskSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(5000).optional(),
    priority: z.enum(ISSUE_PRIORITIES).optional(),
  })
  .strict();

export const aiBreakdownOutputSchema = z
  .object({
    tasks: z
      .array(draftTaskSchema)
      .min(1, "AI must generate at least one task")
      .max(
        MAX_TASKS_PER_BREAKDOWN,
        `AI cannot generate more than ${MAX_TASKS_PER_BREAKDOWN} tasks at once`,
      ),
  })
  .strict();

export type DraftTask = z.infer<typeof draftTaskSchema>;
export type AIBreakdownOutput = z.infer<typeof aiBreakdownOutputSchema>;
