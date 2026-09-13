import { NextResponse } from "next/server";

import { addWorkspaceMemberSchema } from "@/features/workspace/schemas/add-member.schema";
import { toWorkspaceMemberResponse } from "@/features/workspace/workspace-member-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { logger } from "@/lib/logger";
import { userRepository } from "@/repositories/auth/user.repository";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";
import {
  WORKSPACE_INVITATION_TTL_MS,
  workspaceInvitationRepository,
} from "@/repositories/workspace/workspace-invitation.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";
import { emailService } from "@/services/auth/email.service";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

// Reuses addWorkspaceMemberSchema (email + role) — identical shape to the
// existing "add existing member" input, no need for a second schema.
//
// Two outcomes, decided server-side, never left to the client to choose:
// - the email already belongs to an Orbit account -> preserves the exact
//   existing POST /api/workspaces/[workspaceId]/members behavior (that
//   route is untouched and still works identically on its own; this is
//   the same outcome reachable through a second entry point)
// - the email doesn't -> creates a WorkspaceInvitation and emails it
//   through the existing emailService/Resend pipeline
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId } = await params;
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "ADMIN",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const body = await request.json();
    const data = addWorkspaceMemberSchema.parse(body);

    // Invitation identity is normalized (trimmed + lowercased) so that
    // "John@Example.com" and "john@example.com" are always treated as the
    // same recipient across repeated invites — see
    // workspace-invitation.repository.ts's own comment. This is scoped to
    // the WorkspaceInvitation row's own `email` column; User.email itself
    // is untouched (still stored exactly as the account owner typed it).
    const normalizedEmail = data.email.trim().toLowerCase();

    // Case-insensitive on purpose (see user.repository.ts's own comment):
    // an admin typing "John@Example.com" must still find an existing
    // "john@example.com" account and add them directly, not incorrectly
    // treat them as unregistered and send a needless invitation.
    const existingUser = await userRepository.findByEmailCaseInsensitive(data.email);
    if (existingUser) {
      const existingMembership = await workspaceMemberRepository.findByWorkspaceAndUser(
        workspaceId,
        existingUser.id,
      );
      if (existingMembership) {
        return NextResponse.json(
          {
            error: "already_member",
            message: "This user is already a member of the workspace",
          },
          { status: 409 },
        );
      }

      const created = await workspaceMemberRepository.create({
        workspaceId,
        userId: existingUser.id,
        role: data.role,
      });

      return NextResponse.json(
        {
          status: "added",
          ...toWorkspaceMemberResponse({ ...created, user: existingUser }),
        },
        { status: 201 },
      );
    }

    // No account exists yet for this email — invite instead. The
    // workspace row itself is only needed for the email's copy (its
    // name); requireWorkspaceAccess having already resolved a membership
    // for this workspaceId guarantees the workspace exists (FK-backed),
    // so this is a plain lookup, not a re-validation.
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) return NextResponse.json(NOT_FOUND, { status: 404 });

    // Keep exactly one live invitation per (workspace, normalizedEmail) —
    // same "invalidate old, mint one fresh" pattern resend-verification
    // uses. This alone is NOT sufficient under concurrent requests (two
    // requests can both see "nothing pending" before either commits) —
    // the database's own partial unique index
    // (WorkspaceInvitation_workspaceId_email_pending_key, see
    // schema.prisma) is what actually guarantees the invariant; this
    // invalidate step just keeps the common, non-concurrent case tidy
    // without relying on a constraint violation for every re-invite.
    await workspaceInvitationRepository.invalidatePendingForWorkspaceAndEmail(
      workspaceId,
      normalizedEmail,
    );

    const rawToken = generateToken();
    let invitation;
    try {
      invitation = await workspaceInvitationRepository.create({
        workspaceId,
        inviterId: session.user.id,
        email: normalizedEmail,
        role: data.role,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + WORKSPACE_INVITATION_TTL_MS),
      });
    } catch (error) {
      const isPendingInvitationConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002";
      if (!isPendingInvitationConflict) throw error;

      // Lost the race: a concurrent request for the same
      // (workspace, normalizedEmail) committed its own pending invitation
      // first, and the partial unique index rejected this one. The token
      // generated above was never persisted, so there is nothing to roll
      // back and — critically — nothing to email either; converging on
      // the winner's already-sent invitation is correct, not sending a
      // second email for a different, non-existent token.
      const existing = await workspaceInvitationRepository.findPendingByWorkspaceAndEmail(
        workspaceId,
        normalizedEmail,
      );
      if (!existing) throw error;

      return NextResponse.json(
        {
          status: "invited",
          email: existing.email,
          role: existing.role,
          expiresAt: existing.expiresAt,
        },
        { status: 201 },
      );
    }

    const acceptUrl = new URL(`/invitations?token=${rawToken}`, request.url);

    // Unlike register/forgot-password's inner try/catch (where the
    // action they guard has already fully succeeded on its own terms),
    // an invitation is useless if it's never delivered — there is no
    // other way for the recipient to discover it, and no notification
    // system (out of scope) to fall back on. A delivery failure here
    // must not leave behind an invitation that looks "sent" but never
    // arrived, so the just-created row is rolled back and the caller
    // gets an explicit, retryable signal — same posture as
    // resend-verification's equivalent failure path.
    try {
      await emailService.sendWorkspaceInvitationEmail(normalizedEmail, {
        workspaceName: workspace.name,
        inviterName: session.user.name ?? session.user.email ?? "A workspace admin",
        acceptUrl: acceptUrl.toString(),
      });
    } catch (emailError) {
      logger.error("Failed to send workspace invitation email", {
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
      await workspaceInvitationRepository.delete(invitation.id);
      return NextResponse.json(
        {
          error: "email_delivery_failed",
          message:
            "We couldn't send the invitation email right now. Please try again later.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        status: "invited",
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
