"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateProject } from "@/features/project/hooks/use-create-project";
import { createProjectSchema } from "@/features/project/schemas/create-project.schema";
import { ApiError } from "@/lib/api-client";

export function CreateProjectForm({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProject = useCreateProject(workspaceId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createProjectSchema.safeParse({
      name,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      const project = await createProject.mutateAsync(parsed.data);
      toast.success("สร้างโปรเจกต์แล้ว");
      router.push(`/w/${slug}/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "สร้างโปรเจกต์ไม่สำเร็จ";
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
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={createProject.isPending} className="self-start">
        {createProject.isPending ? "กำลังสร้าง..." : "สร้างโปรเจกต์"}
      </Button>
    </form>
  );
}
