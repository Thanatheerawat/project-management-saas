import type { Metadata } from "next";

import { CreateWorkspaceForm } from "@/features/workspace/components/create-workspace-form";

export const metadata: Metadata = { title: "สร้าง Workspace — Orbit" };

export default function NewWorkspacePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">สร้าง Workspace ใหม่</h1>
      <CreateWorkspaceForm />
    </div>
  );
}
