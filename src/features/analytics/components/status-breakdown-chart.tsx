"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ISSUE_STATUS_COLOR } from "@/constants/issue";
import { ISSUE_STATUSES } from "@/features/issue/schemas/update-issue.schema";
import type { IssueStatus } from "@/generated/prisma/client";

// Shared between the workspace-wide and project-scoped analytics
// overview — both endpoints return the identical `byStatus` shape (see
// features/analytics/issue-breakdown-response.ts), so one chart
// component renders either. `ISSUE_STATUSES` (already the Kanban
// board's own column-order source) drives category order; colors come
// straight from ISSUE_STATUS_COLOR, no second color definition.
export function StatusBreakdownChart({ data }: { data: Record<IssueStatus, number> }) {
  const chartData = ISSUE_STATUSES.map((status) => ({ status, count: data[status] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: -16 }}>
        <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={ISSUE_STATUS_COLOR[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
