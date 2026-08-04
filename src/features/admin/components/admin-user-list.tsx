"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/features/admin/components/pagination-controls";
import { useAdminUsers } from "@/features/admin/hooks/use-admin-users";

// Row styling mirrors MemberList's bordered-div rows (Milestone 3), not
// Card — this app reserves Card for panel/section framing, plain bordered
// divs for list rows. Email search submits on button click, not on every
// keystroke — no debounce utility exists in this codebase, and a plain
// submit is the simplest thing that works.
export function AdminUserList() {
  const [page, setPage] = useState(1);
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState<string | undefined>(undefined);
  const { data, isLoading, isError } = useAdminUsers(page, email);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setEmail(emailInput.trim() || undefined);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="ค้นหาด้วยอีเมล..."
          aria-label="ค้นหาผู้ใช้ด้วยอีเมล"
        />
        <Button type="submit" variant="outline">
          ค้นหา
        </Button>
      </form>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-destructive text-sm">โหลดรายชื่อผู้ใช้ไม่สำเร็จ</p>
      ) : data.items.length === 0 ? (
        <EmptyState icon={Users} title="ไม่พบผู้ใช้" />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((user) => (
            <Link key={user.id} href={`/admin/users/${user.id}`}>
              <div className="border-border hover:bg-muted/50 flex flex-col gap-2 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground text-sm font-medium">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? "outline" : "destructive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="secondary">{user.role}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {user.workspaceCount} workspace
                  </span>
                </div>
              </div>
            </Link>
          ))}

          <PaginationControls
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
