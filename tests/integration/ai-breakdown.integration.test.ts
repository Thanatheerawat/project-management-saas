import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import type { AIProvider } from "@/services/ai/ai-provider";

import {
  deleteTestUser,
  deleteTestWorkspace,
  sessionFor,
  uniqueEmail,
  uniqueSlug,
} from "./helpers";

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

vi.mock("@/services/ai/ai-provider-factory", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/ai/ai-provider-factory")>();
  return { ...actual, createAIProvider: vi.fn(actual.createAIProvider) };
});
const { createAIProvider } = await import("@/services/ai/ai-provider-factory");
const mockedCreateAIProvider = vi.mocked(createAIProvider);

const { POST: createBreakdown, AI_DAILY_QUOTA_PER_WORKSPACE } =
  await import("@/app/api/workspaces/[workspaceId]/ai/breakdown/route");

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

async function seedJobs(workspaceId: string, userId: string, count: number) {
  await prisma.aiGenerationJob.createMany({
    data: Array.from({ length: count }, () => ({
      workspaceId,
      userId,
      provider: "MOCK" as const,
      status: "SUCCEEDED" as const,
      prompt: "seed",
      taskCount: 3,
    })),
  });
}

describe("POST /api/workspaces/[workspaceId]/ai/breakdown", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    mockedCreateAIProvider.mockReset();
    // deleteTestWorkspace cascades AiGenerationJob rows (onDelete: Cascade
    // in schema.prisma) — no separate cleanup needed for them.
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace() {
    const member = await createUser("ai-member");
    const outsider = await createUser("ai-outsider");
    emails.push(member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "AI Workspace",
        slug: uniqueSlug("ai-ws"),
        members: { create: [{ userId: member.id, role: "MEMBER" }] },
      },
    });
    workspaceIds.push(workspace.id);

    return { workspace, member, outsider };
  }

  it("returns 401 for an unauthenticated request", async () => {
    const { workspace } = await setupWorkspace();
    mockedAuth.mockResolvedValue(null);

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Build a login page" },
      ),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 for a non-member (enumeration-safe)", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Build a login page" },
      ),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a nonexistent workspace, identical to the non-member body", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const asNonMember = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "x" },
      ),
      workspaceCtx(workspace.id),
    );

    const asNonExistent = await createBreakdown(
      jsonRequest(
        "http://localhost:3000/api/workspaces/00000000-0000-0000-0000-000000000000/ai/breakdown",
        "POST",
        { prompt: "x" },
      ),
      workspaceCtx("00000000-0000-0000-0000-000000000000"),
    );

    expect(asNonMember.status).toBe(404);
    expect(asNonExistent.status).toBe(404);
    expect(await asNonMember.json()).toEqual(await asNonExistent.json());
  });

  it("returns 400 for an empty prompt", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "" },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 for a prompt exceeding the maximum length", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "a".repeat(2001) },
      ),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(400);
  });

  it("succeeds for a valid MEMBER request using the MOCK provider, and persists a SUCCEEDED job", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Build a login page with email and password fields" },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as {
      jobId: string;
      status: string;
      tasks: { title: string }[];
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("SUCCEEDED");
    expect(body.tasks.length).toBeGreaterThan(0);

    const job = await prisma.aiGenerationJob.findUniqueOrThrow({
      where: { id: body.jobId },
    });
    expect(job.workspaceId).toBe(workspace.id);
    expect(job.userId).toBe(member.id);
    expect(job.provider).toBe("MOCK");
    expect(job.status).toBe("SUCCEEDED");
    expect(job.taskCount).toBe(body.tasks.length);
  });

  it("allows a request when the workspace is below its daily quota", async () => {
    const { workspace, member } = await setupWorkspace();
    await seedJobs(workspace.id, member.id, AI_DAILY_QUOTA_PER_WORKSPACE - 5);
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Below quota" },
      ),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(201);
  });

  it("allows the request that brings the workspace exactly to its daily quota", async () => {
    const { workspace, member } = await setupWorkspace();
    await seedJobs(workspace.id, member.id, AI_DAILY_QUOTA_PER_WORKSPACE - 1);
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Exactly at quota" },
      ),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(201);

    const countAfter = await prisma.aiGenerationJob.count({
      where: { workspaceId: workspace.id },
    });
    expect(countAfter).toBe(AI_DAILY_QUOTA_PER_WORKSPACE);
  });

  it("returns 429 once the workspace has reached its daily quota", async () => {
    const { workspace, member } = await setupWorkspace();
    await seedJobs(workspace.id, member.id, AI_DAILY_QUOTA_PER_WORKSPACE);
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Over quota" },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(body.error).toBe("quota_exceeded");

    // A rejected-for-quota request must not itself create a new row.
    const countAfter = await prisma.aiGenerationJob.count({
      where: { workspaceId: workspace.id },
    });
    expect(countAfter).toBe(AI_DAILY_QUOTA_PER_WORKSPACE);
  });

  it("persists FAILED with a safe client error when the provider throws", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const failingProvider: AIProvider = {
      generateBreakdown: vi
        .fn()
        .mockRejectedValue(new Error("upstream provider secret detail")),
    };
    mockedCreateAIProvider.mockReturnValueOnce(failingProvider);

    const response = await createBreakdown(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/ai/breakdown`,
        "POST",
        { prompt: "Will fail" },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("ai_generation_failed");
    // The real provider error text must never reach the client.
    expect(body.message).not.toContain("upstream provider secret detail");

    const job = await prisma.aiGenerationJob.findFirstOrThrow({
      where: { workspaceId: workspace.id },
    });
    expect(job.status).toBe("FAILED");
    expect(job.errorMessage).toContain("upstream provider secret detail");
    expect(job.taskCount).toBeNull();
  });

  it("uses env.AI_PROVIDER, which defaults to mock when unset", () => {
    // Can only be verified via an integration test — plain unit tests
    // never load .env (see tests/integration/setup.ts), so importing
    // env.ts there would throw on missing DATABASE_URL/NEXTAUTH_SECRET
    // rather than exercise this default.
    expect(env.AI_PROVIDER).toBe("mock");
    expect(env.GROQ_API_KEY).toBeUndefined();
  });
});

// Separate describe block: these tests mutate process.env and re-import
// env.ts fresh via vi.resetModules() to exercise the M7 Increment 3
// conditional-requirement branch (GROQ_API_KEY required only when
// AI_PROVIDER=groq) — the module-level `import { env }` above is bound
// once at file-load time and is never affected by this, so every other
// test in this file keeps seeing the real, unmodified local .env values.
describe("env — GROQ_API_KEY required only when AI_PROVIDER=groq", () => {
  const originalAiProvider = process.env.AI_PROVIDER;
  const originalGroqApiKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    if (originalAiProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalAiProvider;
    if (originalGroqApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqApiKey;
    vi.resetModules();
  });

  it("fails env validation when AI_PROVIDER=groq and GROQ_API_KEY is unset", async () => {
    delete process.env.GROQ_API_KEY;
    process.env.AI_PROVIDER = "groq";
    vi.resetModules();

    await expect(import("@/config/env")).rejects.toThrow(/GROQ_API_KEY/);
  });

  it("passes env validation when AI_PROVIDER=groq and GROQ_API_KEY is set", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "fake-test-key-not-real";
    vi.resetModules();

    const { env: freshEnv } = await import("@/config/env");
    expect(freshEnv.AI_PROVIDER).toBe("groq");
    expect(freshEnv.GROQ_API_KEY).toBe("fake-test-key-not-real");
  });
});
