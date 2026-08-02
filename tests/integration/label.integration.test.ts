import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  deleteTestUser,
  deleteTestWorkspace,
  sessionFor,
  uniqueEmail,
  uniqueSlug,
} from "./helpers";

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

const { GET: listLabels, POST: createLabel } =
  await import("@/app/api/workspaces/[workspaceId]/labels/route");
const { PATCH: updateLabel, DELETE: deleteLabel } =
  await import("@/app/api/workspaces/[workspaceId]/labels/[labelId]/route");

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

function labelCtx(workspaceId: string, labelId: string) {
  return { params: Promise.resolve({ workspaceId, labelId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Label CRUD", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace() {
    const owner = await createUser("label-owner");
    const admin = await createUser("label-admin");
    const member = await createUser("label-member");
    const outsider = await createUser("label-outsider");
    emails.push(owner.email, admin.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Label Workspace",
        slug: uniqueSlug("label-ws"),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: admin.id, role: "ADMIN" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    workspaceIds.push(workspace.id);

    return { workspace, owner, admin, member, outsider };
  }

  it("POST creates a label when actor is ADMIN+ (Decision Point F)", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Bug",
        color: "#C0392B",
      }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { name: string; color: string };

    expect(response.status).toBe(201);
    expect(body.name).toBe("Bug");
    expect(body.color).toBe("#C0392B");
  });

  it("POST returns 403 forbidden when actor is a plain MEMBER", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Should Fail",
        color: "#000000",
      }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("POST returns 404 for a non-member", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Should 404",
        color: "#000000",
      }),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("POST rejects a duplicate name within the same workspace with 409 name_taken", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const first = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Dup",
        color: "#111111",
      }),
      workspaceCtx(workspace.id),
    );
    expect(first.status).toBe(201);

    const second = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Dup",
        color: "#222222",
      }),
      workspaceCtx(workspace.id),
    );
    const body = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(body.error).toBe("name_taken");
  });

  it("POST rejects an invalid hex color with 400 validation_error", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Bad Color",
        color: "not-a-color",
      }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });

  it("GET list is visible to a plain MEMBER (workspace-scoped read)", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Visible",
        color: "#333333",
      }),
      workspaceCtx(workspace.id),
    );

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await listLabels(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "GET"),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { name: string }[];

    expect(response.status).toBe(200);
    expect(body.some((l) => l.name === "Visible")).toBe(true);
  });

  it("GET list returns 404 for a non-member", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listLabels(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "GET"),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("PATCH updates name/color when actor is ADMIN+", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Editable",
        color: "#444444",
      }),
      workspaceCtx(workspace.id),
    );
    const { id: labelId } = (await created.json()) as { id: string };

    const response = await updateLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/labels/${labelId}`,
        "PATCH",
        { name: "Renamed", color: "#555555" },
      ),
      labelCtx(workspace.id, labelId),
    );
    const body = (await response.json()) as { name: string; color: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Renamed");
    expect(body.color).toBe("#555555");
  });

  it("PATCH returns 403 forbidden for a plain MEMBER", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Member Cannot Edit",
        color: "#666666",
      }),
      workspaceCtx(workspace.id),
    );
    const { id: labelId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await updateLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/labels/${labelId}`,
        "PATCH",
        { name: "Nope" },
      ),
      labelCtx(workspace.id, labelId),
    );

    expect(response.status).toBe(403);
  });

  it("PATCH rejects renaming to a name already used by another label with 409 name_taken", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Taken",
        color: "#777777",
      }),
      workspaceCtx(workspace.id),
    );
    const second = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Renameable",
        color: "#888888",
      }),
      workspaceCtx(workspace.id),
    );
    const { id: labelId } = (await second.json()) as { id: string };

    const response = await updateLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/labels/${labelId}`,
        "PATCH",
        { name: "Taken" },
      ),
      labelCtx(workspace.id, labelId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("name_taken");
  });

  it("PATCH cross-workspace tampering guard: 404 when labelId belongs to a different workspace", async () => {
    const { workspace: workspaceA, admin: adminA } = await setupWorkspace();
    const { workspace: workspaceB, admin: adminB } = await setupWorkspace();

    mockedAuth.mockResolvedValue(sessionFor(adminB.id));
    const createdInB = await createLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceB.id}/labels`,
        "POST",
        {
          name: "Belongs To B",
          color: "#999999",
        },
      ),
      workspaceCtx(workspaceB.id),
    );
    const { id: labelIdInB } = (await createdInB.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(adminA.id));
    const response = await updateLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceA.id}/labels/${labelIdInB}`,
        "PATCH",
        { name: "Hijacked" },
      ),
      labelCtx(workspaceA.id, labelIdInB),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");

    const untouched = await prisma.label.findUniqueOrThrow({ where: { id: labelIdInB } });
    expect(untouched.name).toBe("Belongs To B");
  });

  it("DELETE removes the label when actor is ADMIN+", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Deletable",
        color: "#AAAAAA",
      }),
      workspaceCtx(workspace.id),
    );
    const { id: labelId } = (await created.json()) as { id: string };

    const response = await deleteLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/labels/${labelId}`,
        "DELETE",
      ),
      labelCtx(workspace.id, labelId),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.label.findUnique({ where: { id: labelId } });
    expect(remaining).toBeNull();
  });

  it("DELETE returns 403 forbidden for a plain MEMBER", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createLabel(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/labels`, "POST", {
        name: "Member Cannot Delete",
        color: "#BBBBBB",
      }),
      workspaceCtx(workspace.id),
    );
    const { id: labelId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await deleteLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/labels/${labelId}`,
        "DELETE",
      ),
      labelCtx(workspace.id, labelId),
    );

    expect(response.status).toBe(403);
  });

  it("DELETE cross-workspace tampering guard: 404 when labelId belongs to a different workspace", async () => {
    const { workspace: workspaceA, admin: adminA } = await setupWorkspace();
    const { workspace: workspaceB, admin: adminB } = await setupWorkspace();

    mockedAuth.mockResolvedValue(sessionFor(adminB.id));
    const createdInB = await createLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceB.id}/labels`,
        "POST",
        {
          name: "Protected",
          color: "#CCCCCC",
        },
      ),
      workspaceCtx(workspaceB.id),
    );
    const { id: labelIdInB } = (await createdInB.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(adminA.id));
    const response = await deleteLabel(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceA.id}/labels/${labelIdInB}`,
        "DELETE",
      ),
      labelCtx(workspaceA.id, labelIdInB),
    );

    expect(response.status).toBe(404);

    const untouched = await prisma.label.findUnique({ where: { id: labelIdInB } });
    expect(untouched).not.toBeNull();
  });
});
