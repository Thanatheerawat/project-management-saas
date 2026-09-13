"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddMember } from "@/features/workspace/hooks/use-add-member";
import {
  addWorkspaceMemberSchema,
  ASSIGNABLE_WORKSPACE_ROLES,
} from "@/features/workspace/schemas/add-member.schema";
import { ApiError } from "@/lib/api-client";

// Only rendered by the members page for ADMIN+ callers (mirrors
// WorkspaceSettingsForm's page-level gate) — the API enforces this too, this
// is purely so a Member never sees a form that would 403 on submit.
export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ASSIGNABLE_WORKSPACE_ROLES)[number]>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const addMember = useAddMember(workspaceId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = addWorkspaceMemberSchema.safeParse({ email, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      const result = await addMember.mutateAsync(parsed.data);
      toast.success(
        result.status === "added" ? "Member added" : `Invitation sent to ${result.email}`,
      );
      setEmail("");
      setRole("MEMBER");
    } catch (err) {
      // "email_delivery_failed" (the invite was created but couldn't be
      // sent) gets its own message since "Failed to add member" would be
      // actively misleading — the account-existence branch never reaches
      // this catch block at all, only the invite-and-email branch can.
      const message =
        err instanceof ApiError && err.code === "email_delivery_failed"
          ? "Couldn't send the invitation email. Please try again."
          : err instanceof ApiError
            ? err.message
            : "Failed to add member";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="member-email" className="text-foreground text-sm font-medium">
          Member Email
        </label>
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-role" className="text-foreground text-sm font-medium">
          Role
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as (typeof ASSIGNABLE_WORKSPACE_ROLES)[number])
          }
          className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-[3px]"
        >
          {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={addMember.isPending}>
        {addMember.isPending ? "Adding..." : "Add or Invite"}
      </Button>
      {/* Communicates the branching behavior without a second control —
          the email itself is what decides which happens (see
          POST .../invitations, which makes that same decision
          server-side). */}
      <p className="text-muted-foreground text-xs sm:basis-full">
        Existing Orbit accounts are added immediately. Anyone else is sent an email
        invitation.
      </p>
      {error && <p className="text-destructive text-sm sm:basis-full">{error}</p>}
    </form>
  );
}
