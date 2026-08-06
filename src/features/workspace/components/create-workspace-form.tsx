"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWorkspace } from "@/features/workspace/hooks/use-create-workspace";
import { createWorkspaceSchema } from "@/features/workspace/schemas/create-workspace.schema";
import { ApiError } from "@/lib/api-client";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createWorkspace = useCreateWorkspace();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createWorkspaceSchema.safeParse({
      name,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      const workspace = await createWorkspace.mutateAsync(parsed.data);
      toast.success("สร้าง Workspace แล้ว");
      router.push(`/w/${workspace.slug}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "สร้าง Workspace ไม่สำเร็จ";
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
      <Button type="submit" disabled={createWorkspace.isPending} className="self-start">
        {createWorkspace.isPending ? "กำลังสร้าง..." : "สร้าง Workspace"}
      </Button>
    </form>
  );
}
