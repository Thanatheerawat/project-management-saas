"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/features/admin/components/pagination-controls";
import { useAdminUsers } from "@/features/admin/hooks/use-admin-users";

// Table-based (Increment 4, M6.5) — was a list of bordered divs, each
// wrapping the whole row in a <Link>. A <table> row can't validly wrap an
// <a> (breaks table semantics), so the row-as-link pattern becomes
// link-around-the-identity-cell instead — the standard convention for
// data tables (GitHub/Linear included), and the Link's accessible name
// still contains the user's name *and* email exactly as the old row did,
// so it keeps matching the same text either was searched for. Email
// search still submits on button click, not on every keystroke — no
// debounce utility exists in this codebase, and a plain submit is the
// simplest thing that works.
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
          placeholder="Search by email..."
          aria-label="Search users by email"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-destructive text-sm">Failed to load users</p>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Try searching a different email"
          className="border-border rounded-xl border border-dashed"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="border-border overflow-hidden rounded-xl border">
            <Table aria-label="All users">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Workspace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="whitespace-normal">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="focus-visible:ring-ring/50 -m-1 flex flex-col gap-0.5 rounded-md p-1 outline-none focus-visible:ring-[3px]"
                      >
                        <span className="text-foreground text-sm font-medium">
                          {user.name ?? user.email}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {user.email}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "outline" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {user.workspaceCount} workspace
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
