import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const ownerEmail = uniqueEmail("e2e-issue-perm-owner");
const memberEmail = uniqueEmail("e2e-issue-perm-member");
const outsiderEmail = uniqueEmail("e2e-issue-perm-outsider");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("issue-perm-ws");
const outsiderWorkspaceName = uniqueSlug("issue-perm-outsider-ws");
const projectName = `Permissions Project ${Date.now()}`;
const issueTitle = `Shared issue ${Date.now()}`;
const editedByMemberTitle = `Shared issue, edited by member ${Date.now()}`;
const labelName = `Triage ${Date.now()}`;
const ownerCommentBody = "Owner's note on this one.";
const memberCommentBody = "Member's note on this one.";

// Three independent browser contexts (browser.newPage() per role, same
// technique member-management.spec.ts uses) so Owner, Member, and an
// unrelated Outsider are genuinely separate logged-in sessions at once —
// covers member invite, RBAC (Decision Points F/G/H), and cross-workspace
// access (the Outsider owns a completely different workspace, mirroring
// tests/integration/workspace-isolation.integration.test.ts's setup, not
// just an anonymous visitor).
test.describe
  .serial("Issue permissions: member invite, RBAC, cross-workspace access", () => {
  let ownerPage: Page;
  let memberPage: Page;
  let outsiderPage: Page;
  let issueUrl: string;

  test.beforeAll(async ({ browser }) => {
    ownerPage = await browser.newPage();
    memberPage = await browser.newPage();
    outsiderPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await ownerPage.close();
    await memberPage.close();
    await outsiderPage.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestWorkspace(outsiderWorkspaceName);
    await deleteTestUser(ownerEmail);
    await deleteTestUser(memberEmail);
    await deleteTestUser(outsiderEmail);
  });

  test("setup: register all three accounts; owner creates a workspace/project/issue, outsider creates an unrelated workspace", async () => {
    await registerViaUi(ownerPage, {
      name: "Issue Perm Owner",
      email: ownerEmail,
      password,
    });
    await registerViaUi(memberPage, {
      name: "Issue Perm Member",
      email: memberEmail,
      password,
    });
    await registerViaUi(outsiderPage, {
      name: "Issue Perm Outsider",
      email: outsiderEmail,
      password,
    });

    await ownerPage.goto("/workspaces/new");
    await ownerPage.getByLabel("Workspace Name").fill(workspaceName);
    await ownerPage.getByRole("button", { name: "Create Workspace" }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`/w/${workspaceName}$`));

    await ownerPage.goto(`/w/${workspaceName}/projects/new`);
    await ownerPage.getByLabel("Project Name").fill(projectName);
    await ownerPage.getByRole("button", { name: "Create Project" }).click();
    // A generic `[^/]+$` also matches the literal "new" segment of the
    // pre-submit URL — see issue-flow.spec.ts's setup test for the full
    // explanation of the race this avoids.
    await expect(ownerPage).toHaveURL(
      new RegExp(`/w/${workspaceName}/projects/[0-9a-f-]{36}$`),
    );
    await expect(ownerPage.getByRole("heading", { name: projectName })).toBeVisible();

    await ownerPage.getByRole("button", { name: "New Issue" }).click();
    await ownerPage.getByLabel("Issue Title").fill(issueTitle);
    await ownerPage.getByRole("button", { name: "Create Issue" }).click();
    await ownerPage.getByRole("link", { name: new RegExp(issueTitle) }).click();
    await expect(ownerPage.getByRole("heading", { name: issueTitle })).toBeVisible();
    issueUrl = ownerPage.url();

    await outsiderPage.goto("/workspaces/new");
    await outsiderPage.getByLabel("Workspace Name").fill(outsiderWorkspaceName);
    await outsiderPage.getByRole("button", { name: "Create Workspace" }).click();
    await expect(outsiderPage).toHaveURL(new RegExp(`/w/${outsiderWorkspaceName}$`));
  });

  test("the owner invites the member by email", async () => {
    await ownerPage.goto(`/w/${workspaceName}/members`);
    await ownerPage.getByLabel("Member Email").fill(memberEmail);
    await ownerPage.getByRole("button", { name: "Add Member" }).click();

    await expect(ownerPage.getByText("Issue Perm Member")).toBeVisible();
  });

  test("the member can open the issue from the Kanban board and edit it (Decision Point G: MEMBER+ can edit any issue)", async () => {
    await memberPage.goto(issueUrl);
    await expect(memberPage.getByRole("heading", { name: issueTitle })).toBeVisible();

    await memberPage.getByLabel("Issue Title").fill(editedByMemberTitle);
    await memberPage.getByRole("button", { name: "Save" }).click();

    await expect(
      memberPage.getByRole("heading", { name: editedByMemberTitle }),
    ).toBeVisible();
  });

  test("the owner creates a workspace label from the issue detail page (ADMIN+ only, Decision Point F)", async () => {
    await ownerPage.goto(issueUrl);
    await ownerPage.getByLabel("New Label Name").fill(labelName);
    await ownerPage.getByLabel("Color (hex)").fill("#B2551E");
    await ownerPage.getByRole("button", { name: "Create" }).click();

    await expect(
      ownerPage
        .getByLabel("Select label to attach")
        .getByRole("option", { name: labelName }),
    ).toHaveCount(1);
  });

  test("the member does not see the create-label form, but can attach the existing label (Decision Point F: attach is MEMBER+)", async () => {
    await memberPage.reload();

    await expect(memberPage.getByLabel("New Label Name")).toHaveCount(0);

    await memberPage
      .getByLabel("Select label to attach")
      .selectOption({ label: labelName });
    await memberPage.getByRole("button", { name: "Attach" }).click();
    await expect(memberPage.getByText(labelName)).toBeVisible();
  });

  test("the owner posts a comment", async () => {
    await ownerPage.goto(issueUrl);
    await ownerPage.getByLabel("Add a comment").fill(ownerCommentBody);
    await ownerPage.getByRole("button", { name: "Post Comment" }).click();

    await expect(ownerPage.getByText(ownerCommentBody)).toBeVisible();
  });

  test("the member sees the owner's comment but has no edit/delete controls on it (not the author, not ADMIN+, Decision Point H)", async () => {
    await memberPage.reload();

    await expect(memberPage.getByText(ownerCommentBody)).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(
      memberPage.getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);
  });

  test("the member can post their own comment and then edit/delete it (author has full control over their own comment)", async () => {
    await memberPage.getByLabel("Add a comment").fill(memberCommentBody);
    await memberPage.getByRole("button", { name: "Post Comment" }).click();
    await expect(memberPage.getByText(memberCommentBody)).toBeVisible();

    await expect(
      memberPage.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: "Delete", exact: true }),
    ).toBeVisible();
  });

  test("the owner (ADMIN+) can moderate-delete the member's comment", async () => {
    await ownerPage.reload();

    // Two "Delete" buttons now exist (owner's own comment + the member's) —
    // scope to the row containing the member's comment text so this
    // targets the right one regardless of DOM order.
    const memberCommentRow = ownerPage
      .locator("div", { hasText: memberCommentBody })
      .last();
    await memberCommentRow.getByRole("button", { name: "Delete", exact: true }).click();
    await ownerPage.getByRole("button", { name: "Confirm" }).click();

    await expect(ownerPage.getByText(memberCommentBody)).toHaveCount(0);
  });

  test("the member cannot delete the issue via the API (RBAC: DELETE is ADMIN+ only)", async () => {
    const issueId = issueUrl.match(/\/issues\/([^/]+)$/)?.[1];
    if (!issueId) throw new Error(`Could not extract issueId from ${issueUrl}`);

    const response = await memberPage.request.delete(`/api/issues/${issueId}`);
    expect(response.status()).toBe(403);
  });

  test("a member of a completely different workspace gets 404 opening this issue directly (cross-workspace access)", async () => {
    await outsiderPage.goto(issueUrl);

    await expect(
      outsiderPage.getByRole("heading", { name: "Page Not Found" }),
    ).toBeVisible();
  });
});
