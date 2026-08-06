"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateProject } from "@/features/project/hooks/use-update-project";
import {
  PROJECT_STATUSES,
  updateProjectSchema,
} from "@/features/project/schemas/update-project.schema";
import { ApiError } from "@/lib/api-client";

interface EditProjectFormProps {
  slug: string;
  projectId: string;
  initialName: string;
  initialDescription: string;
  initialStatus: (typeof PROJECT_STATUSES)[number];
}

// Initializes directly from server-fetched values (the edit page reads the
// project via projectRepository before rendering this) — same reasoning as
// ProfileFields/WorkspaceSettingsForm: no effect needed to sync state in.
export function EditProjectForm({
  slug,
  projectId,
  initialName,
  initialDescription,
  initialStatus,
}: EditProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [status, setStatus] = useState<(typeof PROJECT_STATUSES)[number]>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const updateProject = useUpdateProject(projectId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = updateProjectSchema.safeParse({
      name,
      description: description || undefined,
      status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await updateProject.mutateAsync(parsed.data);
      toast.success("บันทึกโปรเจกต์แล้ว");
      router.push(`/w/${slug}/projects/${projectId}`);
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
        <label htmlFor="project-name" className="text-foreground text-sm font-medium">
          ชื่อโปรเจกต์
        </label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="project-description"
          className="text-foreground text-sm font-medium"
        >
          คำอธิบาย (ถ้ามี)
        </label>
        <Input
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-status" className="text-foreground text-sm font-medium">
          สถานะ
        </label>
        <select
          id="project-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof PROJECT_STATUSES)[number])}
          className="border-input dark:bg-input/30 h-8 w-fit rounded-lg border bg-transparent px-2.5 text-sm outline-none"
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={updateProject.isPending} className="self-start">
        {updateProject.isPending ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </form>
  );
}
