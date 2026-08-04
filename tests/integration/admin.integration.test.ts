import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlatformRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";

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

const { GET: getOverview } = await import("@/app/api/admin/overview/route");
const { GET: getWorkspaces } = await import("@/app/api/admin/workspaces/route");
const { GET: getWorkspace } =
  await import("@/app/api/admin/workspaces/[workspaceId]/route");
const { GET: getUsers } = await import("@/app/api/admin/users/route");
const { GET: getUser, PATCH: patchUser } =
  await import("@/app/api/admin/users/[userId]/route");
const { GET: getAuditLog } = await import("@/app/api/admin/audit-log/route");
const { GET: getHealth } = await import("@/app/api/admin/health/route");

function jsonRequest(url: string, method = "GET", body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function userCtx(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

async function createUser(
  prefix: string,
  role: PlatformRole = "USER",
): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x", role },
  });
  return { id: user.id, email };
}

const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

describe("Admin API", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace(ownerId: string, name: string) {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: uniqueSlug("admin-ws"),
        members: { create: [{ userId: ownerId, role: "OWNER" }] },
      },
    });
    workspaceIds.push(workspace.id);
    return workspace;
  }

  describe("RBAC across all endpoints", () => {
    it("USER gets 403, ADMIN and SUPER_ADMIN get 200, no session gets 401", async () => {
      const owner = await createUser("admin-rbac-owner");
      const target = await createUser("admin-rbac-target");
      const plainUser = await createUser("admin-rbac-plain");
      const admin = await createUser("admin-rbac-admin", "ADMIN");
      const superAdmin = await createUser("admin-rbac-super", "SUPER_ADMIN");
      emails.push(
        owner.email,
        target.email,
        plainUser.email,
        admin.email,
        superAdmin.email,
      );
      const workspace = await setupWorkspace(owner.id, "RBAC Workspace");

      const endpoints: { name: string; call: () => Promise<Response> }[] = [
        { name: "GET overview", call: () => getOverview() },
        {
          name: "GET workspaces",
          call: () =>
            getWorkspaces(jsonRequest("http://localhost:3000/api/admin/workspaces")),
        },
        {
          name: "GET workspace detail",
          call: () =>
            getWorkspace(
              jsonRequest(`http://localhost:3000/api/admin/workspaces/${workspace.id}`),
              workspaceCtx(workspace.id),
            ),
        },
        {
          name: "GET users",
          call: () => getUsers(jsonRequest("http://localhost:3000/api/admin/users")),
        },
        {
          name: "GET user detail",
          call: () =>
            getUser(
              jsonRequest(`http://localhost:3000/api/admin/users/${target.id}`),
              userCtx(target.id),
            ),
        },
        {
          name: "GET audit log",
          call: () =>
            getAuditLog(jsonRequest("http://localhost:3000/api/admin/audit-log")),
        },
        { name: "GET health", call: () => getHealth() },
      ];

      for (const endpoint of endpoints) {
        mockedAuth.mockResolvedValue(null);
        expect((await endpoint.call()).status, `${endpoint.name}: no session`).toBe(401);

        mockedAuth.mockResolvedValue(sessionFor(plainUser.id, "USER"));
        expect((await endpoint.call()).status, `${endpoint.name}: USER`).toBe(403);

        mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
        expect((await endpoint.call()).status, `${endpoint.name}: ADMIN`).toBe(200);

        mockedAuth.mockResolvedValue(sessionFor(superAdmin.id, "SUPER_ADMIN"));
        expect((await endpoint.call()).status, `${endpoint.name}: SUPER_ADMIN`).toBe(200);
      }
    });
  });

  describe("GET /api/admin/overview", () => {
    it("returns platform-wide counts that reflect newly created rows", async () => {
      const admin = await createUser("admin-overview-caller", "ADMIN");
      emails.push(admin.email);

      const before = {
        users: await prisma.user.count(),
        workspaces: await prisma.workspace.count(),
        projects: await prisma.project.count(),
      };

      const owner = await createUser("admin-overview-owner");
      emails.push(owner.email);
      const workspace = await setupWorkspace(owner.id, "Overview Workspace");
      await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: "Overview Project",
          key: "OVW",
          ownerId: owner.id,
        },
      });

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getOverview();
      const body = (await response.json()) as {
        userCount: number;
        workspaceCount: number;
        projectCount: number;
        issueOverview: { total: number; byStatus: Record<string, number> };
      };

      expect(response.status).toBe(200);
      expect(body.userCount).toBe(before.users + 1);
      expect(body.workspaceCount).toBe(before.workspaces + 1);
      expect(body.projectCount).toBe(before.projects + 1);
      expect(typeof body.issueOverview.total).toBe("number");
      expect(Object.keys(body.issueOverview.byStatus)).toEqual(
        expect.arrayContaining([
          "BACKLOG",
          "TODO",
          "IN_PROGRESS",
          "IN_REVIEW",
          "DONE",
          "CANCELLED",
        ]),
      );
    });
  });

  describe("GET /api/admin/workspaces", () => {
    it("returns the owner/member/project fields the mapper produces", async () => {
      const admin = await createUser("admin-ws-list-caller", "ADMIN");
      const owner = await createUser("admin-ws-list-owner");
      emails.push(admin.email, owner.email);
      const workspace = await setupWorkspace(owner.id, "List Workspace");

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getWorkspaces(
        jsonRequest("http://localhost:3000/api/admin/workspaces"),
      );
      const body = (await response.json()) as {
        items: { id: string; ownerEmail: string | null; memberCount: number }[];
        total: number;
        page: number;
        pageSize: number;
      };

      expect(response.status).toBe(200);
      expect(body.pageSize).toBe(20);
      const found = body.items.find((item) => item.id === workspace.id);
      expect(found?.ownerEmail).toBe(owner.email);
      expect(found?.memberCount).toBe(1);
    });
  });

  describe("GET /api/admin/workspaces/[workspaceId]", () => {
    it("returns the workspace detail for a real id", async () => {
      const admin = await createUser("admin-ws-detail-caller", "ADMIN");
      const owner = await createUser("admin-ws-detail-owner");
      emails.push(admin.email, owner.email);
      const workspace = await setupWorkspace(owner.id, "Detail Workspace");

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getWorkspace(
        jsonRequest(`http://localhost:3000/api/admin/workspaces/${workspace.id}`),
        workspaceCtx(workspace.id),
      );
      const body = (await response.json()) as { id: string; name: string };

      expect(response.status).toBe(200);
      expect(body.id).toBe(workspace.id);
      expect(body.name).toBe("Detail Workspace");
    });

    it("returns 404 for a nonexistent workspace id", async () => {
      const admin = await createUser("admin-ws-404-caller", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getWorkspace(
        jsonRequest(`http://localhost:3000/api/admin/workspaces/${NONEXISTENT_ID}`),
        workspaceCtx(NONEXISTENT_ID),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/admin/users", () => {
    it("maps fields correctly and never leaks passwordHash", async () => {
      const admin = await createUser("admin-user-list-caller", "ADMIN");
      const target = await createUser("admin-user-list-target");
      emails.push(admin.email, target.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getUsers(
        jsonRequest("http://localhost:3000/api/admin/users"),
      );
      const body = (await response.json()) as {
        items: Record<string, unknown>[];
      };

      expect(response.status).toBe(200);
      const found = body.items.find((item) => item.id === target.id);
      expect(found).toBeDefined();
      expect(found?.email).toBe(target.email);
      expect(found?.role).toBe("USER");
      expect(found?.isActive).toBe(true);
      expect(found?.workspaceCount).toBe(0);
      expect(Object.hasOwn(found ?? {}, "passwordHash")).toBe(false);
    });

    it("paginates and scopes results with the email filter", async () => {
      const admin = await createUser("admin-user-page-caller", "ADMIN");
      emails.push(admin.email);
      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));

      const token = `pagetest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await prisma.user.createMany({
        data: Array.from({ length: 22 }, (_, i) => ({
          email: `${token}-${i}@orbit-integration-test.local`,
          name: `Page ${i}`,
          passwordHash: "x",
        })),
      });

      try {
        const page1 = await getUsers(
          jsonRequest(`http://localhost:3000/api/admin/users?email=${token}&page=1`),
        );
        const page1Body = (await page1.json()) as {
          items: { id: string; email: string }[];
          total: number;
          page: number;
          pageSize: number;
        };
        expect(page1Body.total).toBe(22);
        expect(page1Body.page).toBe(1);
        expect(page1Body.items).toHaveLength(20);

        const page2 = await getUsers(
          jsonRequest(`http://localhost:3000/api/admin/users?email=${token}&page=2`),
        );
        const page2Body = (await page2.json()) as {
          items: { id: string; email: string }[];
        };
        expect(page2Body.items).toHaveLength(2);

        const page1Ids = new Set(page1Body.items.map((u) => u.id));
        expect(page2Body.items.every((u) => !page1Ids.has(u.id))).toBe(true);

        // Email filtering: a narrower query scopes to exactly the matching row.
        const narrow = await getUsers(
          jsonRequest(`http://localhost:3000/api/admin/users?email=${token}-7`),
        );
        const narrowBody = (await narrow.json()) as {
          items: { email: string }[];
          total: number;
        };
        expect(narrowBody.total).toBe(1);
        expect(narrowBody.items[0]?.email).toBe(
          `${token}-7@orbit-integration-test.local`,
        );
      } finally {
        await prisma.user.deleteMany({ where: { email: { contains: token } } });
      }
    });
  });

  describe("GET /api/admin/users/[userId]", () => {
    it("returns 404 for a nonexistent user id", async () => {
      const admin = await createUser("admin-user-404-caller", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${NONEXISTENT_ID}`),
        userCtx(NONEXISTENT_ID),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/users/[userId] — business rules", () => {
    it("rejects an empty body with 400", async () => {
      const admin = await createUser("admin-patch-empty-caller", "ADMIN");
      const target = await createUser("admin-patch-empty-target");
      emails.push(admin.email, target.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${target.id}`, "PATCH", {}),
        userCtx(target.id),
      );

      expect(response.status).toBe(400);
    });

    it("returns 404 for a nonexistent target user", async () => {
      const admin = await createUser("admin-patch-404-caller", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${NONEXISTENT_ID}`, "PATCH", {
          isActive: false,
        }),
        userCtx(NONEXISTENT_ID),
      );

      expect(response.status).toBe(404);
    });

    it("self-role-change is rejected with 400, even for SUPER_ADMIN", async () => {
      const superAdmin = await createUser("admin-self-role-super", "SUPER_ADMIN");
      emails.push(superAdmin.email);

      mockedAuth.mockResolvedValue(sessionFor(superAdmin.id, "SUPER_ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${superAdmin.id}`, "PATCH", {
          role: "ADMIN",
        }),
        userCtx(superAdmin.id),
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe("self_role_change_forbidden");

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: superAdmin.id },
      });
      expect(stored.role).toBe("SUPER_ADMIN");
    });

    it("self-deactivation is rejected with 400", async () => {
      const admin = await createUser("admin-self-deactivate", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${admin.id}`, "PATCH", {
          isActive: false,
        }),
        userCtx(admin.id),
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe("self_deactivation_forbidden");

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(stored.isActive).toBe(true);
    });

    it("a plain ADMIN cannot change another user's PlatformRole", async () => {
      const admin = await createUser("admin-cannot-role-caller", "ADMIN");
      const target = await createUser("admin-cannot-role-target");
      emails.push(admin.email, target.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${target.id}`, "PATCH", {
          role: "ADMIN",
        }),
        userCtx(target.id),
      );

      expect(response.status).toBe(403);

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      expect(stored.role).toBe("USER");
    });

    it("SUPER_ADMIN can change another user's PlatformRole", async () => {
      const superAdmin = await createUser("admin-can-role-caller", "SUPER_ADMIN");
      const target = await createUser("admin-can-role-target");
      emails.push(superAdmin.email, target.email);

      mockedAuth.mockResolvedValue(sessionFor(superAdmin.id, "SUPER_ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${target.id}`, "PATCH", {
          role: "ADMIN",
        }),
        userCtx(target.id),
      );
      const body = (await response.json()) as { role: string };

      expect(response.status).toBe(200);
      expect(body.role).toBe("ADMIN");

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      expect(stored.role).toBe("ADMIN");
    });

    it("a plain ADMIN can change another user's isActive", async () => {
      const admin = await createUser("admin-can-active-caller", "ADMIN");
      const target = await createUser("admin-can-active-target");
      emails.push(admin.email, target.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await patchUser(
        jsonRequest(`http://localhost:3000/api/admin/users/${target.id}`, "PATCH", {
          isActive: false,
        }),
        userCtx(target.id),
      );
      const body = (await response.json()) as { isActive: boolean };

      expect(response.status).toBe(200);
      expect(body.isActive).toBe(false);

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      expect(stored.isActive).toBe(false);
    });
  });

  describe("GET /api/admin/audit-log", () => {
    it("filters entries so every returned row matches the requested action", async () => {
      const admin = await createUser("admin-audit-caller", "ADMIN");
      emails.push(admin.email);
      await auditLogRepository.record("PASSWORD_RESET_REQUESTED", admin.id);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getAuditLog(
        jsonRequest(
          "http://localhost:3000/api/admin/audit-log?action=PASSWORD_RESET_REQUESTED",
        ),
      );
      const body = (await response.json()) as {
        items: { action: string }[];
      };

      expect(response.status).toBe(200);
      expect(body.items.length).toBeGreaterThan(0);
      expect(
        body.items.every((entry) => entry.action === "PASSWORD_RESET_REQUESTED"),
      ).toBe(true);
    });

    it("returns unfiltered results (a mix of actions) with no action param", async () => {
      const admin = await createUser("admin-audit-nofilter-caller", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getAuditLog(
        jsonRequest("http://localhost:3000/api/admin/audit-log"),
      );
      const body = (await response.json()) as { items: unknown[]; pageSize: number };

      expect(response.status).toBe(200);
      expect(body.pageSize).toBe(20);
    });
  });

  describe("GET /api/admin/health", () => {
    it("reports database reachability", async () => {
      const admin = await createUser("admin-health-caller", "ADMIN");
      emails.push(admin.email);

      mockedAuth.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
      const response = await getHealth();
      const body = (await response.json()) as {
        database: { reachable: boolean; latencyMs: number };
      };

      expect(response.status).toBe(200);
      expect(body.database.reachable).toBe(true);
      expect(typeof body.database.latencyMs).toBe("number");
    });
  });
});
