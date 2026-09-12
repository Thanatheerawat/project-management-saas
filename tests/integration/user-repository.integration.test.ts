import { afterEach, describe, expect, it } from "vitest";

import { userRepository } from "@/repositories/auth/user.repository";

import { deleteTestUser, uniqueEmail } from "./helpers";

// P1-2: findByEmail/findById are the safe-by-default lookups every
// non-credential caller uses (register's dup-check, forgot-password,
// verify-email, resend-verification, /api/users/me, workspace member
// invite, ProjectDetailPage) — this suite exists to lock in that
// `passwordHash` can never silently reappear on their return shape, while
// confirming the fields those callers actually read are still present.
// findByEmailWithPasswordHash/findByIdWithPasswordHash are the two
// narrowly-scoped exceptions (login, change-password) and are asserted to
// still carry the hash.
describe("userRepository password-hash exposure", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("findByEmail never returns passwordHash, but returns the fields non-credential callers rely on", async () => {
    const email = uniqueEmail("userrepo-findbyemail");
    createdEmails.push(email);
    await userRepository.create({ name: "Repo Test", email, passwordHash: "x" });

    const user = await userRepository.findByEmail(email);

    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("lockedUntil");
    expect(user).not.toHaveProperty("failedLoginAttempts");
    // Fields real callers read (forgot-password, /api/users/me, workspace
    // member invite) must still be present.
    expect(user?.id).toBeTruthy();
    expect(user?.email).toBe(email);
    expect(user?.name).toBe("Repo Test");
    expect(user?.isActive).toBe(true);
    expect(user).toHaveProperty("emailVerified");
    expect(user).toHaveProperty("image");
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("jobTitle");
    expect(user).toHaveProperty("createdAt");
    expect(user).toHaveProperty("lastLoginAt");
  });

  it("findById never returns passwordHash, but returns the fields non-credential callers rely on", async () => {
    const email = uniqueEmail("userrepo-findbyid");
    createdEmails.push(email);
    const created = await userRepository.create({
      name: "Repo Test",
      email,
      passwordHash: "x",
    });

    const user = await userRepository.findById(created.id);

    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("lockedUntil");
    expect(user).not.toHaveProperty("failedLoginAttempts");
    expect(user?.id).toBe(created.id);
    expect(user?.email).toBe(email);
  });

  it("findByEmailWithPasswordHash returns passwordHash for the login flow", async () => {
    const email = uniqueEmail("userrepo-findbyemail-pwd");
    createdEmails.push(email);
    await userRepository.create({ name: "Repo Test", email, passwordHash: "x" });

    const user = await userRepository.findByEmailWithPasswordHash(email);

    expect(user).not.toBeNull();
    expect(user?.passwordHash).toBe("x");
    expect(user).toHaveProperty("isActive");
    expect(user).toHaveProperty("lockedUntil");
  });

  it("findByIdWithPasswordHash returns passwordHash for the change-password flow", async () => {
    const email = uniqueEmail("userrepo-findbyid-pwd");
    createdEmails.push(email);
    const created = await userRepository.create({
      name: "Repo Test",
      email,
      passwordHash: "x",
    });

    const user = await userRepository.findByIdWithPasswordHash(created.id);

    expect(user).not.toBeNull();
    expect(user?.id).toBe(created.id);
    expect(user?.passwordHash).toBe("x");
  });
});
