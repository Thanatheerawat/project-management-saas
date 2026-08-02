import { NextResponse } from "next/server";

import { toProjectResponse } from "@/features/project/project-response";
import { createProjectSchema } from "@/features/project/schemas/create-project.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { deriveIssueKey } from "@/lib/issue-key";
import { projectRepository } from "@/repositories/workspace/project.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

// Visibility: every workspace Member can see every project in that
// workspace (Decision Point 1, approved) — there's no per-project
// membership model in this milestone, so "MEMBER" is the only bar here.
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

    const projects = await projectRepository.findManyByWorkspace(workspaceId);

    return NextResponse.json(projects.map(toProjectResponse));
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner/Admin only (Decision Point 2, approved) — Members are
// contributors, not project creators.
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
    const data = createProjectSchema.parse(body);

    const existing = await projectRepository.findByWorkspaceAndName(
      workspaceId,
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

    // Auto-derived from the name (Milestone 4 Increment 1) — not yet
    // client-settable, same as slug is auto-derived (not user-typed) on
    // workspace creation. Collision handling also mirrors that: a 409 with
    // no silent retry-with-suffix, since the creator can just pick a
    // different name. A user-editable key field is a later Milestone 4
    // increment, not this one.
    const key = deriveIssueKey(data.name);
    const keyTaken = await projectRepository.findByWorkspaceAndKey(workspaceId, key);
    if (keyTaken) {
      return NextResponse.json(
        {
          error: "key_taken",
          message: "A project with a similar name already exists in the workspace",
        },
        { status: 409 },
      );
    }

    // The creator becomes the initial project owner — status isn't
    // client-settable at creation, it's the ProjectStatus default (ACTIVE).
    const project = await projectRepository.create({
      workspaceId,
      name: data.name,
      description: data.description,
      ownerId: session.user.id,
      key,
    });

    return NextResponse.json(toProjectResponse(project), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
