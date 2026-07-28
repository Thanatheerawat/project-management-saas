import type { User, WorkspaceMember } from "@/generated/prisma/client";

// Used by every member route (list, add, role-change) so all three
// return the same shape — never spreads the full User row, so
// passwordHash and other sensitive fields can't leak by accident even if
// the query that produced `member.user` changes later.
export function toWorkspaceMemberResponse(member: WorkspaceMember & { user: User }) {
  return {
    id: member.id,
    role: member.role,
    createdAt: member.createdAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    },
  };
}
