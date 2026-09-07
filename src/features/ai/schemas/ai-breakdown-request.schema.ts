import { z } from "zod";

// Generous enough for a real task-breakdown prompt (several sentences of
// context), but bounded so a caller can't send an arbitrarily large body
// into the provider call — longer than createIssueSchema's description
// (5000) since a prompt is meant to describe a whole chunk of work, not
// one field of it.
export const MAX_PROMPT_LENGTH = 2000;

export const aiBreakdownRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(MAX_PROMPT_LENGTH),
});

export type AIBreakdownRequest = z.infer<typeof aiBreakdownRequestSchema>;
