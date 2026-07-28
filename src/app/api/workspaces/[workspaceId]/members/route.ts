import { NextResponse } from "next/server";

import { addWorkspaceMemberSchema } from "@/features/workspace/schemas/add-member.schema";
import { toWorkspaceMemberResponse } from "@/features/workspace/workspace-member-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { userRepository } from "@/repositories/auth/user.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
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
      "MEMBER",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const members = await workspaceMemberRepository.findManyByWorkspace(workspaceId);

    return NextResponse.json(members.map(toWorkspaceMemberResponse));
  } catch (error) {
    return handleApiError(error);
  }
}

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

    // No email-invite flow yet — the target must already have a TeamFlow
    // account (see add-member.schema.ts). Revealing "no account with that
    // email" here is intentional: unlike the pre-auth forgot-password
    // flow, this is an authenticated, already-permissioned admin action,
    // not a public/anonymous one.
    const targetUser = await userRepository.findByEmail(data.email);
    if (!targetUser) {
      return NextResponse.json(
        { error: "not_found", message: "No account found for that email" },
        { status: 404 },
      );
    }

    const existingMembership = await workspaceMemberRepository.findByWorkspaceAndUser(
      workspaceId,
      targetUser.id,
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
      userId: targetUser.id,
      role: data.role,
    });

    return NextResponse.json(
      toWorkspaceMemberResponse({ ...created, user: targetUser }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
