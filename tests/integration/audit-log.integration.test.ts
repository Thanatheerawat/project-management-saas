import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";

import { deleteTestUser, uniqueEmail } from "./helpers";

describe("auditLogRepository.record", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("records an action with a userId and metadata", async () => {
    const email = uniqueEmail("audit-with-user");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Audit User", passwordHash: "x" },
    });

    const row = await auditLogRepository.record("PROFILE_UPDATED", user.id, {
      name: "changed",
    });

    const stored = await prisma.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.userId).toBe(user.id);
    expect(stored.action).toBe("PROFILE_UPDATED");
    expect((stored.metadata as { name?: string } | null)?.name).toBe("changed");
  });

  it("records an action with no userId for events with no matching account", async () => {
    const row = await auditLogRepository.record("LOGIN_FAILED", undefined, {
      email: "ghost@example.com",
    });

    const stored = await prisma.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.userId).toBeNull();
    expect(stored.action).toBe("LOGIN_FAILED");

    await prisma.auditLog.delete({ where: { id: row.id } });
  });

  it("survives the user being deleted afterward (onDelete: SetNull)", async () => {
    const email = uniqueEmail("audit-setnull");
    const user = await prisma.user.create({
      data: { email, name: "Audit SetNull", passwordHash: "x" },
    });
    const row = await auditLogRepository.record("LOGOUT", user.id);

    await prisma.user.delete({ where: { id: user.id } });

    const stored = await prisma.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.userId).toBeNull();

    await prisma.auditLog.delete({ where: { id: row.id } });
  });
});
