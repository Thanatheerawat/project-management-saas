import { NextResponse } from "next/server";

import { toProjectResponse } from "@/features/project/project-response";
import { updateProjectSchema } from "@/features/project/schemas/update-project.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceMembership } from "@/lib/auth/workspace-membership";
import { requireWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { projectRepository } from "@/repositories/workspace/project.repository";

// Deliberately the exact same body/status whether the project truly
// doesn't exist or it exists but the caller isn't a member of its
// workspace — same account-enumeration-safe pattern as everywhere else
// in this codebase (M2's forgot-password, workspace routes). A caller
// who IS a member but lacks the role for an action gets a distinguishable
// 403 instead (see PATCH/DELETE below) — that's fine, they've already
// proven they can see the project.
const NOT_FOUND = { error: "not_found", message: "Project not found" } as const;

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { projectId } = await params;
    const project = await projectRepository.findById(projectId);
    if (!project) return NextResponse.json(NOT_FOUND, { status: 404 });

    const membership = await resolveWorkspaceMembership(
      project.workspaceId,
      session.user.id,
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json(toProjectResponse(project));
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

    const { projectId } = await params;
    const project = await projectRepository.findById(projectId);
    if (!project) return NextResponse.json(NOT_FOUND, { status: 404 });

    const membership = await resolveWorkspaceMembership(
      project.workspaceId,
      session.user.id,
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });
    requireWorkspaceRole(membership.role, "ADMIN");

    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    if (data.name && data.name !== project.name) {
      const existing = await projectRepository.findByWorkspaceAndName(
        project.workspaceId,
        data.name,
      );
      if (existing) {
        return NextResponse.json(
          {
            error: "name_taken",
            message: "A project with this name already exists in the workspace",
          },
          { status: 409 },
        );
      }
    }

    const updated = await projectRepository.update(projectId, data);

    return NextResponse.json(toProjectResponse(updated));
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

    const { projectId } = await params;
    const project = await projectRepository.findById(projectId);
    if (!project) return NextResponse.json(NOT_FOUND, { status: 404 });

    const membership = await resolveWorkspaceMembership(
      project.workspaceId,
      session.user.id,
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });
    requireWorkspaceRole(membership.role, "ADMIN");

    await projectRepository.delete(projectId);

    return NextResponse.json({ message: "Project deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
