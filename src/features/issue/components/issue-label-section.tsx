"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttachLabel } from "@/features/issue/hooks/use-attach-label";
import { useCreateLabel } from "@/features/issue/hooks/use-create-label";
import { useDetachLabel } from "@/features/issue/hooks/use-detach-label";
import { useIssueLabels } from "@/features/issue/hooks/use-issue-labels";
import { useLabels } from "@/features/issue/hooks/use-labels";
import { createLabelSchema } from "@/features/issue/schemas/create-label.schema";
import { ApiError } from "@/lib/api-client";

// Attach/detach an *existing* label is MEMBER+ (Decision Point F — applying
// a label is ordinary triage work); only creating a brand-new label
// definition is gated to ADMIN+ here, matching
// POST /api/workspaces/[workspaceId]/labels's own bar exactly.
export function IssueLabelSection({
  issueId,
  projectId,
  workspaceId,
  canManageLabels,
}: {
  issueId: string;
  projectId: string;
  workspaceId: string;
  canManageLabels: boolean;
}) {
  const issueLabels = useIssueLabels(issueId);
  const workspaceLabels = useLabels(workspaceId);
  const attachLabel = useAttachLabel(issueId, projectId);
  const detachLabel = useDetachLabel(issueId, projectId);
  const createLabel = useCreateLabel(workspaceId);

  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6B7280");
  const [error, setError] = useState<string | null>(null);

  const attachedIds = new Set(issueLabels.data?.map((label) => label.id));
  const availableToAttach = (workspaceLabels.data ?? []).filter(
    (label) => !attachedIds.has(label.id),
  );

  async function handleAttach() {
    setError(null);
    if (!selectedLabelId) return;
    try {
      await attachLabel.mutateAsync({ labelId: selectedLabelId });
      setSelectedLabelId("");
      toast.success("Label attached");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to attach label";
      setError(message);
      toast.error(message);
    }
  }

  async function handleDetach(labelId: string) {
    setError(null);
    try {
      await detachLabel.mutateAsync(labelId);
      toast.success("Label removed");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove label";
      setError(message);
      toast.error(message);
    }
  }

  async function handleCreateLabel(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createLabelSchema.safeParse({
      name: newLabelName,
      color: newLabelColor,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      await createLabel.mutateAsync(parsed.data);
      setNewLabelName("");
      setNewLabelColor("#6B7280");
      toast.success("Label created");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create label";
      setError(message);
      toast.error(message);
    }
  }

  if (issueLabels.isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {issueLabels.data?.map((label) => (
          <Badge
            key={label.id}
            variant="outline"
            style={{ color: label.color, borderColor: label.color }}
          >
            {label.name}
            <button
              type="button"
              aria-label={`Delete label ${label.name}`}
              onClick={() => handleDetach(label.id)}
              disabled={detachLabel.isPending}
              className="ml-0.5 cursor-pointer"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        {issueLabels.data?.length === 0 && (
          <span className="text-muted-foreground text-xs">No labels yet</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label="Select label to attach"
          value={selectedLabelId}
          onChange={(e) => setSelectedLabelId(e.target.value)}
          disabled={workspaceLabels.isLoading || availableToAttach.length === 0}
          className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-7 rounded-lg border bg-transparent px-2 text-xs outline-none focus-visible:ring-[3px]"
        >
          <option value="">
            {availableToAttach.length === 0 ? "No labels to attach" : "Select label"}
          </option>
          {availableToAttach.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAttach}
          disabled={!selectedLabelId || attachLabel.isPending}
        >
          Attach
        </Button>
      </div>

      {canManageLabels && (
        <form
          onSubmit={handleCreateLabel}
          className="border-border flex items-end gap-2 rounded-lg border border-dashed p-2"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="new-label-name"
              className="text-foreground text-sm font-medium"
            >
              New Label Name
            </label>
            <Input
              id="new-label-name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-label-color"
              className="text-foreground text-sm font-medium"
            >
              Color (hex)
            </label>
            <Input
              id="new-label-color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="h-7 w-24 text-xs"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={createLabel.isPending}
          >
            Create
          </Button>
        </form>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
