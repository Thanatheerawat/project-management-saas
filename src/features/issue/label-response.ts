import type { Label } from "@/generated/prisma/client";

// Used by every label route (list, create, update) — same motivation as
// toProjectResponse: one shape, not three hand-picked ones.
export function toLabelResponse(label: Label) {
  return {
    id: label.id,
    workspaceId: label.workspaceId,
    name: label.name,
    color: label.color,
    createdAt: label.createdAt,
  };
}
