"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateWorkspace } from "@/features/workspace/hooks/use-update-workspace";
import { updateWorkspaceSchema } from "@/features/workspace/schemas/update-workspace.schema";
import { ApiError } from "@/lib/api-client";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  initialName: string;
  initialSlug: string;
  initialDescription: string;
}

// Initializes directly from server-fetched values (resolveWorkspaceForRequest,
// called in the settings page) — same reasoning as ProfileFields: no effect
// needed to sync state in after the fact, since this only mounts once the
// data already exists.
export function WorkspaceSettingsForm({
  workspaceId,
  initialName,
  initialSlug,
  initialDescription,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const updateWorkspace = useUpdateWorkspace(workspaceId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = updateWorkspaceSchema.safeParse({
      name,
      slug,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      const updated = await updateWorkspace.mutateAsync(parsed.data);
      // A toast (not local state) survives the navigation below — when the
      // slug changes, router.push swaps in a whole new /w/[slug]/settings
      // page (different dynamic param, so this component remounts fresh
      // and any local "saved" state would be lost before it ever rendered).
      toast.success("บันทึกการตั้งค่าแล้ว");
      if (updated.slug !== initialSlug) {
        // The URL (/w/[slug]/settings) is keyed on the old slug — follow the
        // rename to the new one instead of leaving the page on a stale URL.
        router.push(`/w/${updated.slug}/settings`);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          ชื่อ Workspace
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-foreground text-sm font-medium">
          Slug (URL)
        </label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-foreground text-sm font-medium">
          คำอธิบาย (ถ้ามี)
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={updateWorkspace.isPending} className="self-start">
        {updateWorkspace.isPending ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </form>
  );
}
