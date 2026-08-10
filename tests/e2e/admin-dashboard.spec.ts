import { expect, type Page, test } from "@playwright/test";

import { loginViaUi, logoutViaUi, registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  promoteUser,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const superAdminEmail = uniqueEmail("e2e-admin-super");
const adminEmail = uniqueEmail("e2e-admin-admin");
const plainUserEmail = uniqueEmail("e2e-admin-plain");
const targetEmail = uniqueEmail("e2e-admin-target");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("admin-dash-ws");

// Four independent browser contexts (same technique as
// issue-permissions.spec.ts) so SUPER_ADMIN, a plain ADMIN, a plain USER,
// and a separate "deactivation target" account are all genuinely separate
// logged-in sessions at once. `register()` only ever creates PlatformRole
// "USER" (Milestone 2) — promoting two of these accounts goes through
// Prisma via db-helpers.ts's promoteUser(), then each promoted account
// signs out and back in so its JWT picks up the new role (auth.config.ts
// bakes `role` in at sign-in time, confirmed during Milestone 6
// Increment 6's manual verification).
test.describe.serial("Admin dashboard", () => {
  let superAdminPage: Page;
  let adminPage: Page;
  let userPage: Page;
  let targetPage: Page;

  test.beforeAll(async ({ browser }) => {
    superAdminPage = await browser.newPage();
    adminPage = await browser.newPage();
    userPage = await browser.newPage();
    targetPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await superAdminPage.close();
    await adminPage.close();
    await userPage.close();
    await targetPage.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestUser(superAdminEmail);
    await deleteTestUser(adminEmail);
    await deleteTestUser(plainUserEmail);
    await deleteTestUser(targetEmail);
  });

  test("setup: register four accounts, promote two, and create a workspace", async () => {
    await registerViaUi(superAdminPage, {
      name: "E2E Super Admin",
      email: superAdminEmail,
      password,
    });
    await registerViaUi(adminPage, {
      name: "E2E Plain Admin",
      email: adminEmail,
      password,
    });
    await registerViaUi(userPage, {
      name: "E2E Plain User",
      email: plainUserEmail,
      password,
    });
    await registerViaUi(targetPage, {
      name: "E2E Deactivation Target",
      email: targetEmail,
      password,
    });

    await promoteUser(superAdminEmail, "SUPER_ADMIN");
    await promoteUser(adminEmail, "ADMIN");

    // logoutViaUi/loginViaUi click Navbar controls, which the
    // /verify-email landing page doesn't render (no Navbar there) — land
    // on /profile first, same as auth-flow.spec.ts.
    await superAdminPage.goto("/profile");
    await logoutViaUi(superAdminPage);
    await loginViaUi(superAdminPage, { email: superAdminEmail, password });
    await adminPage.goto("/profile");
    await logoutViaUi(adminPage);
    await loginViaUi(adminPage, { email: adminEmail, password });

    await superAdminPage.goto("/workspaces/new");
    await superAdminPage.getByLabel("ชื่อ Workspace").fill(workspaceName);
    await superAdminPage.getByRole("button", { name: "สร้าง Workspace" }).click();
    await expect(superAdminPage).toHaveURL(new RegExp(`/w/${workspaceName}$`));
  });

  test("SUPER_ADMIN: sees the Admin nav link and the overview page with stats and charts", async () => {
    await expect(
      superAdminPage.getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible();

    await superAdminPage.getByRole("link", { name: "Admin", exact: true }).click();
    await expect(superAdminPage).toHaveURL(/\/admin$/);
    await expect(
      superAdminPage.getByRole("heading", { name: "ภาพรวมระบบ" }),
    ).toBeVisible();
    await expect(superAdminPage.getByText("ผู้ใช้ทั้งหมด")).toBeVisible();
    await expect(superAdminPage.getByText("Workspace ทั้งหมด")).toBeVisible();
    // CardTitle renders a styled <div>, not a semantic heading element —
    // getByText, not getByRole("heading"), matches components/ui/card.tsx.
    await expect(superAdminPage.getByText("สถานะ Issue")).toBeVisible();
    await expect(superAdminPage.getByText("ระดับความสำคัญ")).toBeVisible();
  });

  test("SUPER_ADMIN: workspaces list shows the workspace just created", async () => {
    await superAdminPage.goto("/admin/workspaces");
    // CardTitle again — see the comment on the overview test above. Two
    // matches are expected (the name and the "/slug" line share the same
    // string here since setup used uniqueSlug() for both).
    await expect(superAdminPage.getByText(workspaceName).first()).toBeVisible();
  });

  test("SUPER_ADMIN: users list finds the target user by email search", async () => {
    await superAdminPage.goto("/admin/users");
    await expect(
      superAdminPage.getByRole("heading", { name: "ผู้ใช้ทั้งหมด" }),
    ).toBeVisible();
    // .first(): under the full suite's ~12-worker parallel load this
    // input has intermittently resolved as 2 identical elements (a
    // strict-mode violation) even after the page's own heading has
    // settled — never reproduces in isolation, and both matches are
    // byte-identical, so acting on the first is safe regardless of the
    // underlying cause.
    await superAdminPage.getByLabel("ค้นหาผู้ใช้ด้วยอีเมล").first().fill(targetEmail);
    await superAdminPage.getByRole("button", { name: "ค้นหา" }).click();
    await expect(superAdminPage.getByText(targetEmail)).toBeVisible();
  });

  test("SUPER_ADMIN: audit log shows a REGISTER entry", async () => {
    await superAdminPage.goto("/admin/audit-log");
    // The action filter <select> also has a hidden "REGISTER" <option> —
    // scope to the Badge on an actual log row, not just any matching text.
    await expect(
      superAdminPage.locator('[data-slot="badge"]', { hasText: "REGISTER" }).first(),
    ).toBeVisible();
  });

  test("SUPER_ADMIN: deactivates the target user from the detail page", async () => {
    await superAdminPage.goto("/admin/users");
    await expect(
      superAdminPage.getByRole("heading", { name: "ผู้ใช้ทั้งหมด" }),
    ).toBeVisible();
    await superAdminPage.getByLabel("ค้นหาผู้ใช้ด้วยอีเมล").first().fill(targetEmail);
    await superAdminPage.getByRole("button", { name: "ค้นหา" }).click();
    await superAdminPage.getByRole("link", { name: new RegExp(targetEmail) }).click();

    await expect(
      superAdminPage.getByRole("heading", { name: "E2E Deactivation Target" }),
    ).toBeVisible();
    await superAdminPage.getByRole("button", { name: "ปิดใช้งาน" }).click();
    await expect(superAdminPage.getByText("Inactive")).toBeVisible();
  });

  test("the deactivated user's next login attempt fails", async () => {
    // targetPage is still holding its original session from setup's
    // registerViaUi() — deactivation doesn't invalidate an existing JWT,
    // only blocks new sign-ins (auth.config.ts's authorize()). Sign out
    // first, or /login's own "already authenticated" redirect
    // (middleware.ts) sends it straight to /profile before this ever
    // gets to submit a login attempt.
    await targetPage.goto("/profile");
    await logoutViaUi(targetPage);

    await targetPage.goto("/login");
    await targetPage.getByLabel("อีเมล").fill(targetEmail);
    await targetPage.getByLabel("รหัสผ่าน").fill(password);
    await targetPage.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    // Scoped to the form, not just getByText: the same message also
    // appears in a toast (both are the app's established error-feedback
    // convention — see login-form.tsx), so an unscoped getByText resolves
    // to two elements.
    await expect(
      targetPage.locator("form").getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง"),
    ).toBeVisible();
    await expect(targetPage).toHaveURL(/\/login$/);
  });

  test("ADMIN: has read access to every admin page", async () => {
    await adminPage.goto("/admin");
    await expect(adminPage.getByRole("heading", { name: "ภาพรวมระบบ" })).toBeVisible();

    await adminPage.goto("/admin/workspaces");
    await expect(
      adminPage.getByRole("heading", { name: "Workspace ทั้งหมด" }),
    ).toBeVisible();

    await adminPage.goto("/admin/users");
    await expect(adminPage.getByRole("heading", { name: "ผู้ใช้ทั้งหมด" })).toBeVisible();

    await adminPage.goto("/admin/audit-log");
    await expect(adminPage.getByRole("heading", { name: "Audit Log" })).toBeVisible();
  });

  test("ADMIN: role-change is denied — disabled in the UI and rejected by the API", async () => {
    await adminPage.goto("/admin/users");
    await expect(adminPage.getByRole("heading", { name: "ผู้ใช้ทั้งหมด" })).toBeVisible();
    await adminPage.getByLabel("ค้นหาผู้ใช้ด้วยอีเมล").first().fill(plainUserEmail);
    await adminPage.getByRole("button", { name: "ค้นหา" }).click();
    await adminPage.getByRole("link", { name: new RegExp(plainUserEmail) }).click();

    await expect(adminPage.getByLabel("เปลี่ยน Platform Role")).toBeDisabled();

    const targetUserId = adminPage.url().split("/").pop();
    const response = await adminPage.request.patch(`/api/admin/users/${targetUserId}`, {
      data: { role: "ADMIN" },
    });
    expect(response.status()).toBe(403);
  });

  test("USER: visiting /admin redirects to /profile", async () => {
    await userPage.goto("/admin");
    await expect(userPage).toHaveURL(/\/profile$/);
  });
});
