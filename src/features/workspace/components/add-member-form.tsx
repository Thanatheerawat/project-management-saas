"use client";

import { useState } from "react";

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
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await addMember.mutateAsync(parsed.data);
      setEmail("");
      setRole("MEMBER");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เพิ่มสมาชิกไม่สำเร็จ");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="member-email" className="text-foreground text-sm font-medium">
          อีเมลสมาชิก
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
          className="border-input dark:bg-input/30 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none"
        >
          {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={addMember.isPending}>
        {addMember.isPending ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
      </Button>
      {error && <p className="text-destructive text-sm sm:basis-full">{error}</p>}
    </form>
  );
}
