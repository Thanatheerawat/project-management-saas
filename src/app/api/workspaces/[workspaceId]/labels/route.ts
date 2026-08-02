import { NextResponse } from "next/server";

import { toLabelResponse } from "@/features/issue/label-response";
import { createLabelSchema } from "@/features/issue/schemas/create-label.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { labelRepository } from "@/repositories/issue/label.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

// Visibility: every workspace Member can see labels (Decision Point F —
// workspace-scoped so they're reusable across every project, not tied to
// one).
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

    const labels = await labelRepository.findManyByWorkspace(workspaceId);

    return NextResponse.json(labels.map(toLabelResponse));
  } catch (error) {
    return handleApiError(error);
  }
}

// ADMIN+ only (Decision Point F, approved) — label definitions are
// structural, matching Project creation's bar; applying an existing label
// to an issue is a lower bar (MEMBER+, see /api/issues/[issueId]/labels).
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
    const data = createLabelSchema.parse(body);

    const existing = await labelRepository.findByWorkspaceAndName(workspaceId, data.name);
    if (existing) {
      return NextResponse.json(
        {
          error: "name_taken",
          message: "A label with this name already exists in the workspace",
        },
        { status: 409 },
      );
    }

    const label = await labelRepository.create({
      workspaceId,
      name: data.name,
      color: data.color,
    });

    return NextResponse.json(toLabelResponse(label), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
