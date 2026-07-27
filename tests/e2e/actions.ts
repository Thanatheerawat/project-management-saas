import type { Page } from "@playwright/test";

// Thin UI-driving helpers shared by multiple specs — every step still
// goes through the real pages/forms (no API shortcuts), this just avoids
// repeating the same field-by-field fill-in in each test.
export async function registerViaUi(
  page: Page,
  opts: { name: string; email: string; password: string },
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("ชื่อ").fill(opts.name);
  await page.getByLabel("อีเมล").fill(opts.email);
  await page.getByLabel("รหัสผ่าน").fill(opts.password);
  await page.getByRole("button", { name: "สร้างบัญชี" }).click();
  await page.waitForURL(/\/verify-email\?/);
}

export async function loginViaUi(
  page: Page,
  opts: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(opts.email);
  await page.getByLabel("รหัสผ่าน").fill(opts.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/profile$/);
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.waitForURL("/");
}
