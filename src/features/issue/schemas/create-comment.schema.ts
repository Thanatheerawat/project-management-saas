import { z } from "zod";

// Also used for editing a comment (Decision Point H: the author can edit
// their own comment) — a comment has exactly one editable field and it's
// always required, so there's no partial-update shape distinct from
// creation worth a separate update-comment.schema.ts.
export const createCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
