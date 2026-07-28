import { NextResponse } from "next/server";

import { createWorkspaceSchema } from "@/features/workspace/schemas/create-workspace.schema";
import { toWorkspaceResponse } from "@/features/workspace/workspace-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { slugify } from "@/lib/slug";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const memberships = await workspaceMemberRepository.findManyForUser(session.user.id);

    return NextResponse.json(
      memberships.map((membership) =>
        toWorkspaceResponse(membership.workspace, membership.role),
      ),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

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
    const data = createWorkspaceSchema.parse(body);
    const slug = data.slug ?? slugify(data.name);

    const existing = await workspaceRepository.findBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { error: "slug_taken", message: "That workspace URL is already taken" },
        { status: 409 },
      );
    }

    const workspace = await workspaceRepository.createWithOwner(
      { name: data.name, slug, description: data.description },
      session.user.id,
    );

    return NextResponse.json(toWorkspaceResponse(workspace, "OWNER"), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
