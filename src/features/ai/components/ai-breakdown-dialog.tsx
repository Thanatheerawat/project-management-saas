"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAIBreakdown } from "@/features/ai/hooks/use-ai-breakdown";
import { aiBreakdownRequestSchema } from "@/features/ai/schemas/ai-breakdown-request.schema";
import type { DraftTask } from "@/features/ai/types";
import { useCreateIssue } from "@/features/issue/hooks/use-create-issue";
import { ApiError } from "@/lib/api-client";

// M7 Increment 4: generate an AI task breakdown (Checkpoint A), review and
// select drafts, then Apply creates a real Issue per selected draft via
// the existing POST /api/projects/[projectId]/issues (Checkpoint B) — see
// handleApply below for the sequential-creation/partial-failure design.
//
// Same controlled-Dialog-with-plain-Button convention as
// CreateIssueDialog (plain useState form, sonner toast + inline error,
// ApiError for server-message extraction) — kept consistent with the one
// dialog pattern already in this codebase rather than introducing a new
// one, per the M7 Increment 4 architecture constraints.
type ApplyStatus = "succeeded" | "failed";

export function AIBreakdownDialog(props: { projectId: string; workspaceId: string }) {
  const { projectId, workspaceId } = props;
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DraftTask[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Per-task outcome of the last Apply attempt, keyed by task index.
  // Absent = never attempted (or attempted and still pending in the
  // current run). This — not `selected` — is the single source of truth
  // for "already created," so a retry can never recreate a succeeded
  // draft even if it's still checked.
  const [applyStatus, setApplyStatus] = useState<Map<number, ApplyStatus>>(new Map());
  const [isApplying, setIsApplying] = useState(false);

  const breakdown = useAIBreakdown(workspaceId);
  const createIssue = useCreateIssue(projectId);

  function reset() {
    setPrompt("");
    setError(null);
    setTasks(null);
    setSelected(new Set());
    setApplyStatus(new Map());
    setIsApplying(false);
  }

  function toggleTask(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Reuses the exact request schema/limits the API itself enforces
    // (1-2000 chars, trimmed) — no separate client-side limit invented.
    const parsed = aiBreakdownRequestSchema.safeParse({ prompt });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      const result = await breakdown.mutateAsync(parsed.data);
      setTasks(result.tasks);
      // Default: everything selected, matching the approved Review
      // behavior ("default all generated tasks to selected").
      setSelected(new Set(result.tasks.map((_, index) => index)));
    } catch (err) {
      // The API already shapes every error response (401/404/400/429/502)
      // with a safe, direct-to-user message — no per-status-code branching
      // needed here, same as CreateIssueDialog's own error handling.
      const message =
        err instanceof ApiError ? err.message : "Failed to generate AI breakdown";
      setError(message);
      toast.error(message);
    }
  }

  // Only ever a draft that's (a) currently checked and (b) not already
  // succeeded in a prior Apply attempt — this single derivation backs
  // both the button's enabled/label state and the actual submission
  // below, so there's exactly one place "what's left to do" is computed.
  const pendingSelectedIndices = tasks
    ? [...selected].filter((index) => applyStatus.get(index) !== "succeeded")
    : [];
  const pendingSelectedCount = pendingSelectedIndices.length;

  // Sequential on purpose (not Promise.all) — the existing project
  // convention here is "prefer the simplest thing," and sequential
  // creation makes partial-failure bookkeeping trivial: each task's
  // outcome is known before the next one starts, so there's no risk of
  // a race between two failures/successes updating the same status map.
  // Reuses useCreateIssue exactly as CreateIssueDialog does — no new
  // mutation, no new endpoint, no client-side re-validation of fields
  // the Issue API already validates itself.
  async function handleApply() {
    if (isApplying || !tasks || pendingSelectedIndices.length === 0) return;

    setIsApplying(true);
    const nextStatus = new Map(applyStatus);
    let succeededCount = 0;
    let failedCount = 0;

    for (const index of pendingSelectedIndices) {
      const task = tasks[index];
      try {
        await createIssue.mutateAsync({
          title: task.title,
          description: task.description,
          priority: task.priority,
        });
        nextStatus.set(index, "succeeded");
        succeededCount += 1;
      } catch {
        // The specific ApiError message isn't surfaced per-row — the
        // batch-level toast below reports counts, which is enough to act
        // on (retry); a per-row message would add UI complexity the
        // approved scope doesn't ask for.
        nextStatus.set(index, "failed");
        failedCount += 1;
      }
    }

    setApplyStatus(nextStatus);
    setIsApplying(false);

    if (failedCount === 0) {
      toast.success(`Added ${succeededCount} Issue${succeededCount === 1 ? "" : "s"}`);
      reset();
      setOpen(false);
    } else {
      toast.error(
        `${succeededCount} succeeded, ${failedCount} failed — click "Add as Issue" again to retry only the failed ones`,
      );
      // Dialog stays open (no reset/close) — failed drafts remain
      // checked and selectable for retry; succeeded ones are excluded
      // from the next attempt via applyStatus, not by mutating
      // `selected`, so their checkbox state is left alone too.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        AI Breakdown
      </Button>
      {/* max-w-md (not -lg): empirically verified in the browser at
          768/1024/1440px that `sm:max-w-lg` does not cap this dialog's
          width in this project's compiled Tailwind build (it grows to
          near-viewport-width), while CreateIssueDialog's identical
          pattern with sm:max-w-md correctly caps at 448px. Using the same
          proven value keeps this dialog visually consistent with the
          rest of the app's dialogs regardless of the underlying cause. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Issue with AI</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-prompt" className="text-foreground text-sm font-medium">
              Describe the work you want broken into Issues
            </label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              required
              autoFocus
              disabled={breakdown.isPending}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={breakdown.isPending} className="self-start">
            {breakdown.isPending ? "Generating..." : "Generate Plan"}
          </Button>
        </form>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="text-foreground text-sm font-semibold">
              AI-generated tasks — select which ones to add as Issues
            </p>
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {tasks.map((task, index) => {
                const status = applyStatus.get(index);
                return (
                  <li key={index} className="flex items-start gap-2">
                    <Checkbox
                      id={`ai-task-${index}`}
                      checked={selected.has(index)}
                      onCheckedChange={() => toggleTask(index)}
                      disabled={status === "succeeded"}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`ai-task-${index}`}
                      className="flex flex-1 flex-col gap-0.5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {task.title}
                        </span>
                        {status === "succeeded" && (
                          <Badge variant="outline" className="text-xs">
                            Created
                          </Badge>
                        )}
                        {status === "failed" && (
                          <span className="text-destructive text-xs">Failed</span>
                        )}
                      </span>
                      {task.description && (
                        <span className="text-muted-foreground text-xs">
                          {task.description}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!tasks || pendingSelectedCount === 0 || isApplying}
          >
            {isApplying
              ? "Adding Issues..."
              : pendingSelectedCount > 0
                ? `Add ${pendingSelectedCount} as Issue${pendingSelectedCount === 1 ? "" : "s"}`
                : "Add as Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
