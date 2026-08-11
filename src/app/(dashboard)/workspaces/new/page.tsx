import type { Metadata } from "next";

import { CreateWorkspaceForm } from "@/features/workspace/components/create-workspace-form";

export const metadata: Metadata = { title: "สร้าง Workspace — Orbit" };

export default function NewWorkspacePage() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        สร้าง Workspace ใหม่
      </h1>
      <CreateWorkspaceForm />
    </div>
  );
}
