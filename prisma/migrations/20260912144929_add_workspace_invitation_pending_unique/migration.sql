-- Enforce at most one pending (not-yet-accepted) invitation per
-- (workspaceId, email) at the database level. This is a partial/filtered
-- unique index, which Prisma's schema DSL cannot express directly (see
-- WorkspaceInvitation's own comment in schema.prisma), so this migration
-- is hand-written rather than generated from a schema diff.
--
-- Accepted invitations (acceptedAt IS NOT NULL) are deliberately excluded
-- from this constraint — a user must still be able to receive a new
-- invitation after an old one was accepted, expired, or invalidated; only
-- currently-pending rows are constrained.
CREATE UNIQUE INDEX "WorkspaceInvitation_workspaceId_email_pending_key"
  ON "WorkspaceInvitation" ("workspaceId", "email")
  WHERE "acceptedAt" IS NULL;
