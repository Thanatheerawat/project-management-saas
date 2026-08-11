import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const email = uniqueEmail("e2e-workspace-flow");
const password = "correct horse battery staple";
// uniqueSlug's output (lowercase, hyphen-separated, alphanumeric) is a
// no-op under slugify() — using it as the *name* too means the server's
// auto-generated slug is guaranteed to equal this exact string, so the
// test doesn't have to guess or re-derive what the create route computed.
const firstName = uniqueSlug("acme-inc");
const secondName = uniqueSlug("beta-co");

// One continuous session covering the approved User Flow: Login -> Workspace
// Resolution (0 workspaces -> picker empty state, 1 -> auto-redirect,
// 2+ -> picker list) -> Dashboard -> Switcher back to the picker.
test.describe.serial("Workspace creation, picker, and switcher", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await deleteTestWorkspace(firstName);
    await deleteTestWorkspace(secondName);
    await deleteTestUser(email);
  });

  test("registering and visiting /workspaces with zero workspaces shows the empty-state picker", async () => {
    await registerViaUi(page, { name: "Workspace Flow User", email, password });

    await page.goto("/workspaces");
    await expect(page.getByText("No workspaces yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create Workspace" })).toBeVisible();
  });

  test("creating the first workspace redirects straight to its dashboard", async () => {
    await page.goto("/workspaces/new");
    await page.getByLabel("Workspace Name").fill(firstName);
    await page.getByRole("button", { name: "Create Workspace" }).click();

    await expect(page).toHaveURL(new RegExp(`/w/${firstName}$`));
    await expect(page.getByRole("heading", { name: firstName })).toBeVisible();
  });

  test("visiting /workspaces with exactly one workspace auto-redirects back to it", async () => {
    await page.goto("/workspaces");
    await expect(page).toHaveURL(new RegExp(`/w/${firstName}$`));
  });

  test("creating a second workspace, then /workspaces shows the picker listing both with role badges", async () => {
    await page.goto("/workspaces/new");
    await page.getByLabel("Workspace Name").fill(secondName);
    await page.getByRole("button", { name: "Create Workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${secondName}$`));

    await page.goto("/workspaces");
    await expect(page.getByRole("link", { name: new RegExp(firstName) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(secondName) })).toBeVisible();
    await expect(page.getByText("OWNER").first()).toBeVisible();
  });

  test("the workspace switcher in the dashboard navigates back to the picker", async () => {
    await page.goto(`/w/${firstName}`);
    // WorkspaceSwitcher renders as `<Button asChild><Link>...` — the Slot
    // makes the rendered element an <a> (role "link"), not a <button>.
    await page.getByRole("link", { name: new RegExp(firstName) }).click();

    await expect(page).toHaveURL(/\/workspaces$/);
  });
});
