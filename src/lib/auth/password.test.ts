import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  it("hashes a password to a non-plaintext value", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(
      true,
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword("same password"),
      hashPassword("same password"),
    ]);
    expect(hashA).not.toBe(hashB);
  });
});
