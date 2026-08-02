import type { Comment, User } from "@/generated/prisma/client";

// Never spreads the full User row, so passwordHash and other sensitive
// fields can't leak by accident even if the query that produced
// `comment.author` changes later — same reasoning as
// toWorkspaceMemberResponse.
export function toCommentResponse(comment: Comment & { author: User }) {
  return {
    id: comment.id,
    issueId: comment.issueId,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      email: comment.author.email,
      image: comment.author.image,
    },
  };
}
