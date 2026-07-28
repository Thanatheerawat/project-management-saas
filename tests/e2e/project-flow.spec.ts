import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const email = uniqueEmail("e2e-project-flow");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("project-flow-ws"); // slug-shaped name, see workspace-flow.spec.ts
const projectName = `Design System ${Date.now()}`;

// Create Project flow from the approved User Flow: Dashboard -> Projects ->
// Create -> Detail -> Edit. Runs inside a workspace created fresh for this
// spec (not shared with workspace-flow.spec.ts) so the two suites can run
// in parallel without touching each other's data.
test.describe.serial("Project list, create, detail, and edit", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestUser(email);
  });

  test("setup: register and create a workspace", async () => {
    await registerViaUi(page, { name: "Project Flow User", email, password });

    await page.goto("/workspaces/new");
    await page.getByLabel("ชื่อ Workspace").fill(workspaceName);
    await page.getByRole("button", { name: "สร้าง Workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceName}$`));
  });

  test("the projects page shows the empty state before any project exists", async () => {
    await page.goto(`/w/${workspaceName}/projects`);
    await expect(page.getByText("ยังไม่มีโปรเจกต์")).toBeVisible();
  });

  test("creating a project redirects to its detail page with ACTIVE status", async () => {
    await page.goto(`/w/${workspaceName}/projects/new`);
    await page.getByLabel("ชื่อโปรเจกต์").fill(projectName);
    await page.getByRole("button", { name: "สร้างโปรเจกต์" }).click();

    await expect(page).toHaveURL(new RegExp(`/w/${workspaceName}/projects/[^/]+$`));
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    await expect(page.getByText("ACTIVE")).toBeVisible();
  });

  test("the project appears in the list and links back to the same detail page", async () => {
    await page.goto(`/w/${workspaceName}/projects`);
    await expect(page.getByRole("link", { name: new RegExp(projectName) })).toBeVisible();

    await page.getByRole("link", { name: new RegExp(projectName) }).click();
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  });

  test("editing the project's status persists after save", async () => {
    await page.getByRole("link", { name: "แก้ไข" }).click();
    await page.getByLabel("สถานะ").selectOption("ON_HOLD");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    await expect(page.getByText("ON_HOLD")).toBeVisible();
  });

  test("the updated status is reflected on the dashboard preview", async () => {
    await page.goto(`/w/${workspaceName}`);
    // getByRole("link", ...) — not getByText — matches the single card's
    // computed accessible name. A plain getByText(projectName) is
    // substring-based and, under next dev's Turbopack in this environment,
    // has been observed to transiently match at two DOM nesting levels
    // during a client-side navigation repaint (never under a production
    // build, and never a second real project) — see the Milestone 3 review
    // notes in docs/session-log.md.
    await expect(page.getByRole("link", { name: new RegExp(projectName) })).toBeVisible();
    await expect(page.getByText("ON_HOLD")).toBeVisible();
  });
});
