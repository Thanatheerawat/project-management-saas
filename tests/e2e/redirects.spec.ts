import { expect, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import { deleteTestUser, uniqueEmail } from "./db-helpers";

test.describe("Auth redirects", () => {
  test("visiting /profile with no session redirects to /login with a callbackUrl", async ({
    page,
  }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile/);
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("an authenticated user visiting /login is redirected straight to /profile", async ({
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

      await expect(page).toHaveURL(/\/profile$/);
    } finally {
      await deleteTestUser(email);
    }
  });

  test("an authenticated user visiting /register is redirected straight to /profile", async ({
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

      await expect(page).toHaveURL(/\/profile$/);
    } finally {
      await deleteTestUser(email);
    }
  });
});
