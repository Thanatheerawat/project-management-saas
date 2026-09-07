import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const email = uniqueEmail("e2e-ai-breakdown");
const password = "correct horse battery staple";
const workspaceName = uniqueSlug("ai-breakdown-ws");
const projectName = `AI Breakdown Project ${Date.now()}`;
const prompt = `Redesign the checkout flow ${Date.now()}`;
const taskTitles = [`Design: ${prompt}`, `Implement: ${prompt}`, `Test: ${prompt}`];
const taskPriority: Record<string, string> = {
  [taskTitles[0]]: "HIGH",
  [taskTitles[1]]: "MEDIUM",
  [taskTitles[2]]: "MEDIUM",
};

// M7 Increment 5: end-to-end coverage of the AI Breakdown workflow
// (Increment 4) against the Mock provider. AI_PROVIDER defaults to "mock"
// whenever it's unset (src/config/env.ts), and this repo's own .env
// doesn't set it — no env override needed here. Assertions are
// deterministic because MockAIProvider always returns the same 3 tasks
// (Design/Implement/Test, priorities HIGH/MEDIUM/MEDIUM) for any prompt —
// see mock-ai-provider.ts. Mirrors issue-flow.spec.ts's single
// continuous-journey shape: one workspace/project created fresh for this
// spec so it can run in parallel with the other e2e suites without
// touching their data. Selectors are Thai to match this branch's actual
// UI — feature/m7-ai-features branched off v0.6.5, before the Thai→English
// i18n translation that landed on main, so AIBreakdownDialog (Increment 4)
// still renders Thai text, same as every other spec in this branch's
// tests/e2e/ directory.
test.describe.serial("AI Breakdown: generate, review, select, apply", () => {
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

  test("setup: register, create a workspace, and open a project", async () => {
    await registerViaUi(page, { name: "AI Breakdown User", email, password });

    await page.goto("/workspaces/new");
    await page.getByLabel("ชื่อ Workspace").fill(workspaceName);
    await page.getByRole("button", { name: "สร้าง Workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceName}$`));

    await page.goto(`/w/${workspaceName}/projects/new`);
    await page.getByLabel("ชื่อโปรเจกต์").fill(projectName);
    await page.getByRole("button", { name: "สร้างโปรเจกต์" }).click();
    // Same reasoning as issue-flow.spec.ts: match only a UUID-shaped id so
    // the assertion waits for the real post-submit redirect.
    await expect(page).toHaveURL(
      new RegExp(`/w/${workspaceName}/projects/[0-9a-f-]{36}$`),
    );
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    projectUrl = page.url();
  });

  test("opening AI Breakdown shows the prompt dialog", async () => {
    await page.getByRole("button", { name: "AI Breakdown" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "สร้าง Issue ด้วย AI" }),
    ).toBeVisible();
  });

  test("generating with a valid prompt shows all 3 draft tasks selected by default", async () => {
    await page.getByLabel("อธิบายงานที่ต้องการแบ่งเป็น Issue").fill(prompt);
    await page.getByRole("button", { name: "สร้างแผนงาน" }).click();

    for (const title of taskTitles) {
      const checkbox = page.getByRole("checkbox", { name: new RegExp(title) });
      await expect(checkbox).toBeVisible();
      await expect(checkbox).toBeChecked();
    }
    await expect(
      page.getByRole("button", { name: "เพิ่ม 3 รายการเป็น Issue" }),
    ).toBeEnabled();
  });

  test("deselecting one task updates the selected count", async () => {
    await page.getByRole("checkbox", { name: new RegExp(taskTitles[1]) }).uncheck();

    await expect(
      page.getByRole("button", { name: "เพิ่ม 2 รายการเป็น Issue" }),
    ).toBeEnabled();
  });

  test("deselecting every remaining task disables Apply", async () => {
    await page.getByRole("checkbox", { name: new RegExp(taskTitles[0]) }).uncheck();
    await page.getByRole("checkbox", { name: new RegExp(taskTitles[2]) }).uncheck();

    await expect(page.getByRole("button", { name: "เพิ่มเป็น Issue" })).toBeDisabled();
  });

  test("reselecting all 3 tasks re-enables Apply", async () => {
    for (const title of taskTitles) {
      await page.getByRole("checkbox", { name: new RegExp(title) }).check();
    }

    await expect(
      page.getByRole("button", { name: "เพิ่ม 3 รายการเป็น Issue" }),
    ).toBeEnabled();
  });

  test("applying creates all 3 as real Issues and closes the dialog", async () => {
    await page.getByRole("button", { name: "เพิ่ม 3 รายการเป็น Issue" }).click();

    await expect(page.getByText("เพิ่ม 3 Issue สำเร็จ")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("the created Issues appear on the Kanban board", async () => {
    await page.goto(projectUrl);

    for (const title of taskTitles) {
      await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    }
  });

  // Partial-failure handling (retry skips already-succeeded drafts) is
  // deliberately NOT covered here: forcing one of several sequential
  // createIssue calls to fail deterministically would require either a
  // production-only test hook or introducing HTTP interception
  // (page.route), and this project's e2e suite has no existing
  // HTTP-mocking convention anywhere (confirmed by inspection during M7
  // Increment 5 planning). That exact scenario is already covered
  // deterministically at the component level in
  // ai-breakdown-dialog.test.tsx (Increment 4): partial-failure and
  // retry-no-duplicate cases, with useCreateIssue mocked to fail on demand.
  test("the created Issues carry the priority the AI draft assigned", async () => {
    for (const title of taskTitles) {
      const card = page.getByRole("link", { name: new RegExp(title) });
      await expect(card).toContainText(taskPriority[title]);
    }
  });
});
