import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const email = uniqueEmail("e2e-issue-flow");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("issue-flow-ws"); // slug-shaped name, see workspace-flow.spec.ts
const projectName = `Issue Flow Project ${Date.now()}`;
const issueTitle = `Fix login bug ${Date.now()}`;
const editedIssueTitle = `Fix login bug on mobile ${Date.now()}`;
const labelName = `Regression ${Date.now()}`;
const commentBody = "Can reproduce on the staging build.";
const editedCommentBody = "Can reproduce on the staging build — confirmed on iOS too.";

// One continuous session covering the full Milestone 4 Issue lifecycle:
// create -> open detail -> change status -> edit -> create/attach/detach a
// label -> comment CRUD -> delete. Mirrors project-flow.spec.ts's single
// continuous-journey shape. Runs inside a workspace/project created fresh
// for this spec so it can run in parallel with the other e2e suites
// without touching their data.
test.describe
  .serial("Issue lifecycle: create, edit, status, label, comment, delete", () => {
  let page: Page;
  let projectUrl: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestUser(email);
  });

  test("setup: register, create a workspace, and create a project", async () => {
    await registerViaUi(page, { name: "Issue Flow User", email, password });

    await page.goto("/workspaces/new");
    await page.getByLabel("ชื่อ Workspace").fill(workspaceName);
    await page.getByRole("button", { name: "สร้าง Workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceName}$`));

    await page.goto(`/w/${workspaceName}/projects/new`);
    await page.getByLabel("ชื่อโปรเจกต์").fill(projectName);
    await page.getByRole("button", { name: "สร้างโปรเจกต์" }).click();
    // A generic `[^/]+$` also matches the literal "new" segment of the
    // pre-submit URL, so the assertion could pass before the client-side
    // redirect actually fires and projectUrl would capture the wrong page
    // — matching only a UUID-shaped id forces a real wait for the redirect.
    await expect(page).toHaveURL(
      new RegExp(`/w/${workspaceName}/projects/[0-9a-f-]{36}$`),
    );
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    projectUrl = page.url();
  });

  test("the project detail page shows an empty Kanban board before any issue exists", async () => {
    await expect(page.getByText("ยังไม่มี issue")).toBeVisible();
  });

  test("creating an issue via the dialog shows it on the Kanban board", async () => {
    await page.getByRole("button", { name: "Issue ใหม่" }).click();
    await page.getByLabel("ชื่อ Issue").fill(issueTitle);
    await page.getByLabel("Priority").selectOption("HIGH");
    await page.getByRole("button", { name: "สร้าง Issue" }).click();

    await expect(page.getByRole("link", { name: new RegExp(issueTitle) })).toBeVisible();
  });

  test("clicking the issue card navigates to its detail page", async () => {
    await page.getByRole("link", { name: new RegExp(issueTitle) }).click();

    await expect(page.getByRole("heading", { name: issueTitle })).toBeVisible();
  });

  test("changing the status via the instant-apply select persists after reload", async () => {
    await page.getByLabel("สถานะ Issue").selectOption("IN_PROGRESS");
    await expect(page.getByLabel("สถานะ Issue")).toHaveValue("IN_PROGRESS");

    await page.reload();
    await expect(page.getByLabel("สถานะ Issue")).toHaveValue("IN_PROGRESS");
  });

  test("the issue is still visible on the Kanban board after navigating back", async () => {
    await page.goto(projectUrl);
    await expect(page.getByRole("link", { name: new RegExp(issueTitle) })).toBeVisible();

    await page.getByRole("link", { name: new RegExp(issueTitle) }).click();
    await expect(page.getByRole("heading", { name: issueTitle })).toBeVisible();
    await expect(page.getByLabel("สถานะ Issue")).toHaveValue("IN_PROGRESS");
  });

  test("editing title and priority via the edit form saves", async () => {
    await page.getByLabel("ชื่อ Issue").fill(editedIssueTitle);
    await page.getByLabel("Priority").selectOption("URGENT");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByRole("heading", { name: editedIssueTitle })).toBeVisible();
    await expect(page.getByText("บันทึก Issue แล้ว")).toBeVisible();
  });

  test("creating a new label from the issue detail page adds it to the attach dropdown", async () => {
    await page.getByLabel("ชื่อ Label ใหม่").fill(labelName);
    await page.getByLabel("สี (hex)").fill("#2C7FA6");
    await page.getByRole("button", { name: "สร้าง" }).click();

    await expect(
      page.getByLabel("เลือก Label ที่จะแนบ").getByRole("option", { name: labelName }),
    ).toHaveCount(1);
  });

  test("attaching the label shows it as a badge on the issue", async () => {
    await page.getByLabel("เลือก Label ที่จะแนบ").selectOption({ label: labelName });
    await page.getByRole("button", { name: "แนบ" }).click();

    await expect(page.getByText(labelName)).toBeVisible();
  });

  test("detaching the label removes the badge", async () => {
    await page.getByRole("button", { name: `ลบ Label ${labelName}` }).click();

    await expect(page.getByText("ยังไม่มี Label")).toBeVisible();
  });

  test("posting a comment shows it in the list", async () => {
    await page.getByLabel("เพิ่มความคิดเห็น").fill(commentBody);
    await page.getByRole("button", { name: "แสดงความคิดเห็น" }).click();

    await expect(page.getByText(commentBody)).toBeVisible();
  });

  test("editing the comment persists the new text", async () => {
    await page.getByRole("button", { name: "แก้ไข", exact: true }).click();
    await page.getByLabel("แก้ไขความคิดเห็น").fill(editedCommentBody);
    // .last(): the comment row's own "บันทึก" button, distinct from the
    // Edit Issue form's identically-labeled submit button earlier on the
    // same page — the comment section always renders after the edit form
    // (see issue-detail-panel.tsx), so it's reliably the later match.
    await page.getByRole("button", { name: "บันทึก", exact: true }).last().click();

    await expect(page.getByText(editedCommentBody)).toBeVisible();
  });

  test("deleting the comment via the confirm dialog removes it", async () => {
    await page.getByRole("button", { name: "ลบ", exact: true }).click();
    await page.getByRole("button", { name: "ยืนยัน" }).click();

    await expect(page.getByText("ยังไม่มีความคิดเห็น")).toBeVisible();
  });

  // No Delete Issue UI exists (out of scope since Increment 6 — see the
  // Increment 7 audit's dead-code note on useDeleteIssue). Exercising the
  // real DELETE endpoint directly through this authenticated page's
  // request context is the real user-facing capability being verified
  // without inventing a UI button that isn't part of any approved scope.
  test("deleting the issue via the API removes it, and both its detail page and the board reflect that", async () => {
    const issueUrl = page.url();
    const issueId = issueUrl.match(/\/issues\/([^/]+)$/)?.[1];
    if (!issueId) throw new Error(`Could not extract issueId from ${issueUrl}`);

    const response = await page.request.delete(`/api/issues/${issueId}`);
    expect(response.ok()).toBe(true);

    await page.reload();
    await expect(page.getByRole("heading", { name: "ไม่พบหน้านี้" })).toBeVisible();

    await page.goto(projectUrl);
    await expect(
      page.getByRole("link", { name: new RegExp(editedIssueTitle) }),
    ).toHaveCount(0);
    await expect(page.getByText("ยังไม่มี issue")).toBeVisible();
  });
});
