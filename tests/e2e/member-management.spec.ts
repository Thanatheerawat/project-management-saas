import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const ownerEmail = uniqueEmail("e2e-member-owner");
const memberEmail = uniqueEmail("e2e-member-target");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("member-mgmt-ws");

// Two independent browser contexts (browser.newPage() creates its own
// cookie jar, same technique auth-flow.spec.ts uses for one continuous
// session) so the Owner and the target Member are genuinely two separate
// logged-in sessions at once — not one page logging in and out repeatedly.
test.describe.serial("Member management", () => {
  let ownerPage: Page;
  let memberPage: Page;

  test.beforeAll(async ({ browser }) => {
    ownerPage = await browser.newPage();
    memberPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await ownerPage.close();
    await memberPage.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestUser(ownerEmail);
    await deleteTestUser(memberEmail);
  });

  test("setup: register both accounts and the owner creates a workspace", async () => {
    await registerViaUi(ownerPage, {
      name: "Member Mgmt Owner",
      email: ownerEmail,
      password,
    });
    await registerViaUi(memberPage, {
      name: "Member Mgmt Target",
      email: memberEmail,
      password,
    });

    await ownerPage.goto("/workspaces/new");
    await ownerPage.getByLabel("Workspace Name").fill(workspaceName);
    await ownerPage.getByRole("button", { name: "Create Workspace" }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`/w/${workspaceName}$`));
  });

  test("the owner adds the target user as a MEMBER by email", async () => {
    await ownerPage.goto(`/w/${workspaceName}/members`);
    await ownerPage.getByLabel("Member Email").fill(memberEmail);
    await ownerPage.getByRole("button", { name: "Add Member" }).click();

    await expect(ownerPage.getByText("Member Mgmt Target")).toBeVisible();
  });

  test("the member sees themselves in the list but not the add-member form (MEMBER has no manage rights)", async () => {
    await memberPage.goto(`/w/${workspaceName}/members`);

    await expect(memberPage.getByText("(you)")).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: "Leave Workspace" }),
    ).toBeVisible();
    await expect(memberPage.getByLabel("Member Email")).toHaveCount(0);
  });

  test("the owner promotes the member to ADMIN", async () => {
    await ownerPage.getByLabel(/Change role for/).selectOption("ADMIN");
    await expect(ownerPage.getByLabel(/Change role for/)).toHaveValue("ADMIN");
  });

  test("after promotion, the member now sees the add-member form", async () => {
    await memberPage.reload();
    await expect(memberPage.getByLabel("Member Email")).toBeVisible();
  });

  test("the owner removes the member via the confirm dialog", async () => {
    await ownerPage.getByRole("button", { name: "Remove" }).click();
    await ownerPage.getByRole("button", { name: "Confirm" }).click();

    await expect(ownerPage.getByText("Member Mgmt Target")).toHaveCount(0);
  });

  test("the removed member loses access to the workspace entirely (404, not a permission error)", async () => {
    await memberPage.goto(`/w/${workspaceName}/members`);
    await expect(
      memberPage.getByRole("heading", { name: "Page Not Found" }),
    ).toBeVisible();
  });
});
