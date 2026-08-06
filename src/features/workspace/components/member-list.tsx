"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemoveMember } from "@/features/workspace/hooks/use-remove-member";
import { useUpdateMemberRole } from "@/features/workspace/hooks/use-update-member-role";
import {
  useWorkspaceMembers,
  type WorkspaceMemberResponse,
} from "@/features/workspace/hooks/use-workspace-members";
import { ASSIGNABLE_WORKSPACE_ROLES } from "@/features/workspace/schemas/add-member.schema";
import { ApiError } from "@/lib/api-client";

interface MemberListProps {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
}

export function MemberList({ workspaceId, currentUserId, canManage }: MemberListProps) {
  const members = useWorkspaceMembers(workspaceId);

  if (members.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!members.data || members.data.length === 0) {
    return <EmptyState icon={Users} title="ไม่พบสมาชิก" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {members.data.map((member) => (
        <MemberRow
          key={member.id}
          workspaceId={workspaceId}
          member={member}
          isSelf={member.user.id === currentUserId}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

function MemberRow({
  workspaceId,
  member,
  isSelf,
  canManage,
}: {
  workspaceId: string;
  member: WorkspaceMemberResponse;
  isSelf: boolean;
  canManage: boolean;
}) {
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = member.role === "OWNER";
  // Owner/Admin can change anyone's role or remove them (except the Owner,
  // blocked server-side); a plain Member can only remove themselves
  // (self-leave) — mirrors the exact split in the DELETE route handler.
  const canChangeRole = canManage && !isOwner;
  const canRemove = (canManage || isSelf) && !isOwner;

  async function handleRoleChange(role: string) {
    setError(null);
    try {
      await updateRole.mutateAsync({
        memberId: member.id,
        data: { role: role as (typeof ASSIGNABLE_WORKSPACE_ROLES)[number] },
      });
      toast.success("เปลี่ยน Role แล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "เปลี่ยน Role ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await removeMember.mutateAsync(member.id);
      setConfirmOpen(false);
      toast.success(isSelf ? "ออกจาก Workspace แล้ว" : "ลบสมาชิกแล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "ลบสมาชิกไม่สำเร็จ";
      setError(message);
      toast.error(message);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-foreground text-sm font-medium">
          {member.user.name ?? member.user.email}
          {isSelf && <span className="text-muted-foreground"> (คุณ)</span>}
        </p>
        <p className="text-muted-foreground text-xs">{member.user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        {canChangeRole ? (
          <select
            aria-label={`เปลี่ยน role ของ ${member.user.name ?? member.user.email}`}
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={updateRole.isPending}
            className="border-input dark:bg-input/30 h-7 rounded-lg border bg-transparent px-2 text-xs outline-none"
          >
            {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="outline">{member.role}</Badge>
        )}

        {canRemove && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              {isSelf ? "ออกจาก Workspace" : "ลบ"}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isSelf ? "ออกจาก Workspace?" : "ลบสมาชิกนี้?"}</DialogTitle>
                <DialogDescription>
                  {isSelf
                    ? "คุณจะไม่สามารถเข้าถึง Workspace นี้ได้อีกจนกว่าจะถูกเชิญกลับเข้ามาใหม่"
                    : `${member.user.name ?? member.user.email} จะถูกลบออกจาก Workspace นี้ทันที`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removeMember.isPending}
                >
                  {removeMember.isPending ? "กำลังลบ..." : "ยืนยัน"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {error && <p className="text-destructive w-full text-xs sm:basis-full">{error}</p>}
    </div>
  );
}
