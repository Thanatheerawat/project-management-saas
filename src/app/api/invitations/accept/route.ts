import { NextResponse } from "next/server";

import { acceptInvitationSchema } from "@/features/workspace/schemas/accept-invitation.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { hashToken } from "@/lib/auth/tokens";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";
import { workspaceInvitationRepository } from "@/repositories/workspace/workspace-invitation.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { token } = acceptInvitationSchema.parse(body);
    const tokenHash = hashToken(token);

    // Raw, unfiltered lookup first — purely to distinguish
    // expired/used/never-existed for a clearer error message, same
    // pattern as reset-password/verify-email's own extra diagnostic read.
    // The real acceptance gate is the atomic claim() call below, not this
    // read.
    const invitation = await workspaceInvitationRepository.findByTokenHash(tokenHash);
    if (!invitation) {
      return NextResponse.json(
        { error: "invalid_token", message: "This invitation link is invalid" },
        { status: 400 },
      );
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        {
          error: "invitation_used",
          message: "This invitation has already been accepted",
        },
        { status: 400 },
      );
    }
    if (invitation.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "invitation_expired", message: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Critical binding check: possession of the raw token alone is not
    // enough — the signed-in account's own email must match the address
    // the invitation was actually sent to. Without this, whoever ends up
    // holding a token (e.g. a forwarded email) could accept an invitation
    // meant for someone else by simply being signed in as a different,
    // already-existing account. Checked before any mutation.
    //
    // Case-insensitive: `invitation.email` is already the normalized
    // (trimmed+lowercased) form the invite route always stores (see
    // workspace-invitation.repository.ts's comment); the session's email
    // is normalized here at comparison time only — User.email itself is
    // never rewritten, so "John@Example.com" who registered in response
    // to an invite sent to "john@example.com" is correctly recognized as
    // a match without touching how their account's email is stored.
    if (
      !session.user.email ||
      session.user.email.trim().toLowerCase() !== invitation.email
    ) {
      return NextResponse.json(
        {
          error: "email_mismatch",
          message:
            "This invitation was sent to a different email address. Sign in with the invited email to accept it.",
        },
        { status: 403 },
      );
    }

    // Atomic single-use claim — see workspace-invitation.repository.ts's
    // claim() comment for why no $transaction is needed here. If this
    // returns false, someone (or another concurrent request for the same
    // token) already claimed it between the read above and here.
    const claimed = await workspaceInvitationRepository.claim(invitation.id);
    if (!claimed) {
      return NextResponse.json(
        {
          error: "invitation_used",
          message: "This invitation has already been accepted",
        },
        { status: 400 },
      );
    }

    const workspace = await workspaceRepository.findById(invitation.workspaceId);
    if (!workspace) {
      // Not reachable in practice — WorkspaceInvitation.workspace is
      // onDelete: Cascade, so a deleted workspace takes its invitations
      // with it. Kept only as a defensive guard against the response
      // shape below needing workspace.slug.
      return NextResponse.json(
        { error: "invalid_token", message: "This invitation link is invalid" },
        { status: 400 },
      );
    }

    // The invitation is already claimed at this point (single-use is
    // guaranteed); a duplicate WorkspaceMember row is still possible only
    // if the same user was independently added by an admin
    // (POST .../members) in the moment between claim() and here — the
    // table's own @@unique([workspaceId, userId]) is the backstop, so
    // that race ends in "already a member," never a duplicate row or a
    // crash.
    try {
      await workspaceMemberRepository.create({
        workspaceId: invitation.workspaceId,
        userId: session.user.id,
        role: invitation.role,
      });
    } catch (error) {
      const isDuplicateMembership =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002";
      if (!isDuplicateMembership) throw error;
    }

    return NextResponse.json({
      message: "Invitation accepted",
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
