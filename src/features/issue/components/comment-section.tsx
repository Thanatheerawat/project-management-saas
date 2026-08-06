"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type CommentResponse, useComments } from "@/features/issue/hooks/use-comments";
import { useCreateComment } from "@/features/issue/hooks/use-create-comment";
import { useDeleteComment } from "@/features/issue/hooks/use-delete-comment";
import { useUpdateComment } from "@/features/issue/hooks/use-update-comment";
import { createCommentSchema } from "@/features/issue/schemas/create-comment.schema";
import { ApiError } from "@/lib/api-client";

interface CommentSectionProps {
  issueId: string;
  currentUserId: string;
  // ADMIN+ can delete anyone's comment (Decision Point H) — editing is
  // always author-only, no equivalent "canModerate" override for edit.
  canModerate: boolean;
}

export function CommentSection({
  issueId,
  currentUserId,
  canModerate,
}: CommentSectionProps) {
  const comments = useComments(issueId);
  const createComment = useCreateComment(issueId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createCommentSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง");
      return;
    }

    try {
      await createComment.mutateAsync(parsed.data);
      setBody("");
      toast.success("แสดงความคิดเห็นแล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "แสดงความคิดเห็นไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {comments.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">ยังไม่มีความคิดเห็น</p>
      )}

      <div className="flex flex-col gap-3">
        {comments.data?.map((comment) => (
          <CommentRow
            key={comment.id}
            issueId={issueId}
            comment={comment}
            isAuthor={comment.author.id === currentUserId}
            canModerate={canModerate}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          aria-label="เพิ่มความคิดเห็น"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="แสดงความคิดเห็น..."
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          size="sm"
          disabled={createComment.isPending}
          className="self-start"
        >
          {createComment.isPending ? "กำลังส่ง..." : "แสดงความคิดเห็น"}
        </Button>
      </form>
    </div>
  );
}

function CommentRow({
  issueId,
  comment,
  isAuthor,
  canModerate,
}: {
  issueId: string;
  comment: CommentResponse;
  isAuthor: boolean;
  canModerate: boolean;
}) {
  const updateComment = useUpdateComment(issueId);
  const deleteComment = useDeleteComment(issueId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = isAuthor || canModerate;

  async function handleSave() {
    setError(null);
    const parsed = createCommentSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง");
      return;
    }
    try {
      await updateComment.mutateAsync({ commentId: comment.id, data: parsed.data });
      setIsEditing(false);
      toast.success("บันทึกความคิดเห็นแล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteComment.mutateAsync(comment.id);
      setConfirmOpen(false);
      toast.success("ลบความคิดเห็นแล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "ลบไม่สำเร็จ";
      setError(message);
      toast.error(message);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-medium">
            {comment.author.name ?? comment.author.email}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(comment.createdAt).toLocaleString("th-TH")}
          </span>
        </div>
        {!isEditing && (isAuthor || canDelete) && (
          <div className="flex items-center gap-1">
            {isAuthor && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setDraft(comment.body);
                  setIsEditing(true);
                }}
              >
                แก้ไข
              </Button>
            )}
            {canDelete && (
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmOpen(true)}
                >
                  ลบ
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ลบความคิดเห็นนี้?</DialogTitle>
                    <DialogDescription>การลบนี้ไม่สามารถย้อนกลับได้</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteComment.isPending}
                    >
                      {deleteComment.isPending ? "กำลังลบ..." : "ยืนยัน"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            aria-label="แก้ไขความคิดเห็น"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="xs"
              onClick={handleSave}
              disabled={updateComment.isPending}
            >
              บันทึก
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-foreground text-sm whitespace-pre-wrap">{comment.body}</p>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
