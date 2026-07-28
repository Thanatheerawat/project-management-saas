import { NextResponse } from "next/server";

import { updateWorkspaceSchema } from "@/features/workspace/schemas/update-workspace.schema";
import { toWorkspaceResponse } from "@/features/workspace/workspace-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";

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

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json(toWorkspaceResponse(workspace, membership.role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const data = updateWorkspaceSchema.parse(body);

    if (data.slug) {
      const existing = await workspaceRepository.findBySlug(data.slug);
      if (existing && existing.id !== workspaceId) {
        return NextResponse.json(
          { error: "slug_taken", message: "That workspace URL is already taken" },
          { status: 409 },
        );
      }
    }

    const workspace = await workspaceRepository.update(workspaceId, data);

    return NextResponse.json(toWorkspaceResponse(workspace, membership.role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId } = await params;
    // OWNER only — deleting a workspace cascades all its members and
    // projects (onDelete: Cascade in schema.prisma), so this is
    // deliberately the highest bar in the permission matrix.
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "OWNER",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    await workspaceRepository.delete(workspaceId);

    return NextResponse.json({ message: "Workspace deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
