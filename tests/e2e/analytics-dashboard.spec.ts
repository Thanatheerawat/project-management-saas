import { expect, type Page, test } from "@playwright/test";

import { registerViaUi } from "./actions";
import {
  deleteTestUser,
  deleteTestWorkspace,
  uniqueEmail,
  uniqueSlug,
} from "./db-helpers";

const email = uniqueEmail("e2e-analytics");
const password = "correct horse battery staple";
// Single word, deliberately: Recharts wraps a long multi-word Y-axis
// category label across multiple <tspan> lines and the wrap point drops
// the word-joining space (e.g. "Analytics E2E User" -> "Analytics
// E2EUser") — a cosmetic Recharts text-wrapping quirk, not something to
// work around by touching the frozen chart component this increment.
const userName = "AnalyticsE2EUser";
const workspaceName = uniqueSlug("analytics-dash-ws"); // slug-shaped name, see workspace-flow.spec.ts
const projectOneName = `Analytics Project One ${Date.now()}`;
const projectTwoName = `Analytics Project Two ${Date.now()}`;

// Recharts' Tooltip activates on the hovered category's position along
// the chart's category axis (a full-height/full-width invisible band per
// category), not on the bar's own rendered height/length — so this works
// identically regardless of a bar's pixel size, including a bar whose
// value is 0. Scoped to the specific chart's own
// `.recharts-responsive-container` (found by a category label unique to
// that chart) so multiple charts on the same page never cross-
// contaminate which tooltip gets read.
function chartContainer(page: Page, categoryLabel: string) {
  return page
    .locator(".recharts-responsive-container")
    .filter({ has: page.getByText(categoryLabel, { exact: true }) });
}

async function readTooltipCount(
  container: ReturnType<typeof chartContainer>,
  categoryLabel: string,
): Promise<number> {
  const tooltip = container.locator(".recharts-tooltip-wrapper");
  await expect(tooltip).toContainText(categoryLabel);
  const text = await tooltip.innerText();

  const match = text.match(/count\s*:?\s*(\d+)/i);
  if (!match) {
    throw new Error(
      `Could not parse a count out of tooltip text for "${categoryLabel}": "${text}"`,
    );
  }
  return Number(match[1]);
}

// StatusBreakdownChart/PriorityBreakdownChart: categories run along the
// X-axis, so the tooltip activates on X position — hover at the
// category's tick X, any Y within the plot area.
async function readCategoryCount(page: Page, categoryLabel: string): Promise<number> {
  const container = chartContainer(page, categoryLabel);
  const tick = container.getByText(categoryLabel, { exact: true });
  const tickBox = await tick.boundingBox();
  const containerBox = await container.boundingBox();
  if (!tickBox || !containerBox) {
    throw new Error(`Could not locate chart category "${categoryLabel}"`);
  }

  await page.mouse.move(
    tickBox.x + tickBox.width / 2,
    containerBox.y + containerBox.height / 2,
  );

  return readTooltipCount(container, categoryLabel);
}

// WorkloadChart is a horizontal bar chart (`layout="vertical"` in
// Recharts terms) — its category axis is Y, not X, so the tooltip
// activates on Y position instead: hover at the category's tick Y, any
// X within the plot area.
async function readWorkloadCount(page: Page, categoryLabel: string): Promise<number> {
  const container = chartContainer(page, categoryLabel);
  const tick = container.getByText(categoryLabel, { exact: true });
  const tickBox = await tick.boundingBox();
  const containerBox = await container.boundingBox();
  if (!tickBox || !containerBox) {
    throw new Error(`Could not locate chart category "${categoryLabel}"`);
  }

  await page.mouse.move(
    containerBox.x + containerBox.width / 2,
    tickBox.y + tickBox.height / 2,
  );

  return readTooltipCount(container, categoryLabel);
}

async function createIssueViaDialog(
  page: Page,
  opts: { title: string; priority?: string; assignee?: string },
): Promise<void> {
  await page.getByRole("button", { name: "New Issue" }).click();
  await page.getByLabel("Issue Title").fill(opts.title);
  if (opts.priority) {
    await page.getByLabel("Priority").selectOption(opts.priority);
  }
  if (opts.assignee) {
    await page.getByLabel("Assignee").selectOption({ label: opts.assignee });
  }
  await page.getByRole("button", { name: "Create Issue" }).click();
  await expect(page.getByRole("link", { name: new RegExp(opts.title) })).toBeVisible();
}

// Scenario 1 (single continuous session, mirroring issue-flow.spec.ts):
// known status/priority/assignee mix -> workspace dashboard analytics
// shows the exact values. Scenario 2 (same session, continued): a second
// project proves the project-level analytics summary stays isolated per
// project rather than reflecting the whole workspace.
test.describe.serial("Analytics dashboard: workspace and project summaries", () => {
  let page: Page;
  let projectOneUrl: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await deleteTestWorkspace(workspaceName);
    await deleteTestUser(email);
  });

  test("setup: register, create a workspace, and create the first project with a known issue mix", async () => {
    await registerViaUi(page, { name: userName, email, password });

    await page.goto("/workspaces/new");
    await page.getByLabel("Workspace Name").fill(workspaceName);
    await page.getByRole("button", { name: "Create Workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceName}$`));

    await page.goto(`/w/${workspaceName}/projects/new`);
    await page.getByLabel("Project Name").fill(projectOneName);
    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/w/${workspaceName}/projects/[0-9a-f-]{36}$`),
    );
    await expect(page.getByRole("heading", { name: projectOneName })).toBeVisible();
    projectOneUrl = page.url();

    // Known mix: BACKLOG x2 (A, C) / DONE x1 (B); URGENT x1 (A) / MEDIUM x1
    // (B) / NONE x1 (C, default priority); self-assigned x2 (A, C) /
    // unassigned x1 (B) -> Unassigned bucket.
    await createIssueViaDialog(page, {
      title: "Issue A",
      priority: "URGENT",
      assignee: userName,
    });
    await createIssueViaDialog(page, { title: "Issue B", priority: "MEDIUM" });
    await createIssueViaDialog(page, { title: "Issue C", assignee: userName });

    await page.getByRole("link", { name: /Issue B/ }).click();
    await expect(page.getByRole("heading", { name: "Issue B" })).toBeVisible();
    await page.getByLabel("Issue Status").selectOption("DONE");
    await expect(page.getByLabel("Issue Status")).toHaveValue("DONE");
  });

  test("the workspace dashboard's status/priority breakdown reflects the exact issue mix", async () => {
    await page.goto(`/w/${workspaceName}`);

    expect(await readCategoryCount(page, "BACKLOG")).toBe(2);
    expect(await readCategoryCount(page, "DONE")).toBe(1);
    expect(await readCategoryCount(page, "TODO")).toBe(0);

    expect(await readCategoryCount(page, "URGENT")).toBe(1);
    expect(await readCategoryCount(page, "MEDIUM")).toBe(1);
    expect(await readCategoryCount(page, "NONE")).toBe(1);
    expect(await readCategoryCount(page, "HIGH")).toBe(0);
  });

  test("the workspace dashboard's workload chart reflects assigned and unassigned counts exactly", async () => {
    expect(await readWorkloadCount(page, userName)).toBe(2);
    expect(await readWorkloadCount(page, "Unassigned")).toBe(1);
  });

  test("the first project's own analytics summary matches the same known mix", async () => {
    await page.goto(projectOneUrl);

    expect(await readCategoryCount(page, "BACKLOG")).toBe(2);
    expect(await readCategoryCount(page, "DONE")).toBe(1);
    expect(await readCategoryCount(page, "URGENT")).toBe(1);
  });

  test("creating a second project with a different issue mix", async () => {
    await page.goto(`/w/${workspaceName}/projects/new`);
    await page.getByLabel("Project Name").fill(projectTwoName);
    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/w/${workspaceName}/projects/[0-9a-f-]{36}$`),
    );
    await expect(page.getByRole("heading", { name: projectTwoName })).toBeVisible();

    await createIssueViaDialog(page, { title: "Issue D", priority: "HIGH" });
    await createIssueViaDialog(page, { title: "Issue E", priority: "HIGH" });
  });

  test("the second project's analytics summary reflects only its own issues, not the first project's", async () => {
    // The analytics overview query is deliberately not invalidated by
    // issue-create mutations (see the Milestone 5 architecture proposal's
    // Query Strategy: staleTime is the freshness mechanism, not live
    // invalidation) — a reload is the realistic way a user would see the
    // just-created issues reflected, same as revisiting the dashboard.
    await page.reload();

    expect(await readCategoryCount(page, "HIGH")).toBe(2);
    expect(await readCategoryCount(page, "BACKLOG")).toBe(2);
    // Values that only exist in the first project must not leak in here.
    expect(await readCategoryCount(page, "URGENT")).toBe(0);
    expect(await readCategoryCount(page, "DONE")).toBe(0);
  });

  test("the first project's analytics summary is unaffected by the second project's issues", async () => {
    await page.goto(projectOneUrl);

    expect(await readCategoryCount(page, "BACKLOG")).toBe(2);
    expect(await readCategoryCount(page, "DONE")).toBe(1);
    expect(await readCategoryCount(page, "URGENT")).toBe(1);
    // If the query ever leaked across projects, this would be 4, not 0.
    expect(await readCategoryCount(page, "HIGH")).toBe(0);
  });
});
