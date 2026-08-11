import type { Page } from "@playwright/test";

// Thin UI-driving helpers shared by multiple specs — every step still
// goes through the real pages/forms (no API shortcuts), this just avoids
// repeating the same field-by-field fill-in in each test.
export async function registerViaUi(
  page: Page,
  opts: { name: string; email: string; password: string },
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Name").fill(opts.name);
  await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Password").fill(opts.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL(/\/verify-email\?/);
}

export async function loginViaUi(
  page: Page,
  opts: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Password").fill(opts.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // "/workspaces" (0 memberships) or straight through to "/w/<slug>" (the
  // server-side auto-redirect when the user has exactly one membership) —
  // both are valid post-login landing spots depending on which fixture
  // called this helper; "/profile" is no longer the destination at all.
  await page.waitForURL(/\/(workspaces|w\/)/);
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/");
}
