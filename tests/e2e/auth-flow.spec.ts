import { expect, type Page, test } from "@playwright/test";

import { loginViaUi, logoutViaUi } from "./actions";
import { deleteTestUser, uniqueEmail } from "./db-helpers";

const email = uniqueEmail("e2e-journey");
const password = "correct horse battery staple";
let mockVerifyPath = "";

// One continuous session (test.describe.serial + a single shared `page`,
// not the per-test fixture) so the cookie set by register/login actually
// carries across steps — this mirrors one real user's session end to end:
// register -> verify -> protected route -> logout -> blocked -> login ->
// profile update -> logout -> blocked again.
test.describe.serial("Full authentication journey", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await deleteTestUser(email);
  });

  test("register creates an account, signs the user in, and lands on the mock verify-email link", async () => {
    await page.goto("/register");
    await page.getByLabel("ชื่อ").fill("E2E Journey User");
    await page.getByLabel("อีเมล").fill(email);
    await page.getByLabel("รหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "สร้างบัญชี" }).click();

    await page.waitForURL(/\/verify-email\?/);
    const url = new URL(page.url());
    mockVerifyPath = `${url.pathname}${url.search}`;
    expect(url.searchParams.get("email")).toBe(email);
    expect(url.searchParams.get("token")).toBeTruthy();
  });

  test("the freshly registered session already has access to the protected profile route", async () => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "โปรไฟล์" })).toBeVisible();
  });

  test("email verification (mock) succeeds", async () => {
    await page.goto(mockVerifyPath);
    await page.getByRole("button", { name: "ยืนยันอีเมล" }).click();
    await expect(page.getByText("ยืนยันอีเมลสำเร็จแล้ว")).toBeVisible();
  });

  test("logout ends the session", async () => {
    await page.goto("/profile");
    await logoutViaUi(page);
    await expect(page).toHaveURL("/");
  });

  test("the protected route redirects to /login once logged out", async () => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile/);
  });

  test("logging back in with the verified account redirects to /profile", async () => {
    await loginViaUi(page, { email, password });
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("profile update persists the new name", async () => {
    await page.goto("/profile");
    const nameInput = page.getByLabel("ชื่อ");
    await nameInput.fill("Updated E2E Name");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("บันทึกโปรไฟล์แล้ว")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("ชื่อ")).toHaveValue("Updated E2E Name");
  });

  test("final logout blocks protected route access again", async () => {
    await page.goto("/profile");
    await logoutViaUi(page);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile/);
  });
});
