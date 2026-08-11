import { expect, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import { deleteTestUser, uniqueEmail } from "./db-helpers";

test.describe("Auth redirects", () => {
  test("visiting /profile with no session redirects to /login with a callbackUrl", async ({
    page,
  }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  });

  test("an authenticated user visiting /login is redirected straight to /workspaces", async ({
    page,
  }) => {
    const email = uniqueEmail("e2e-redirect-login");
    try {
      await registerViaUi(page, {
        name: "Redirect Login",
        email,
        password: "correct horse battery staple",
      });

      await page.goto("/login");

      // 0 workspaces at this point (registration alone doesn't create
      // one), so /workspaces stays put rather than auto-redirecting
      // further into a specific workspace.
      await expect(page).toHaveURL(/\/workspaces$/);
    } finally {
      await deleteTestUser(email);
    }
  });

  test("an authenticated user visiting /register is redirected straight to /workspaces", async ({
    page,
  }) => {
    const email = uniqueEmail("e2e-redirect-register");
    try {
      await registerViaUi(page, {
        name: "Redirect Register",
        email,
        password: "correct horse battery staple",
      });

      await page.goto("/register");

      await expect(page).toHaveURL(/\/workspaces$/);
    } finally {
      await deleteTestUser(email);
    }
  });
});
