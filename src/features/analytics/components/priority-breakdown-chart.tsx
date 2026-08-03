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

import { ISSUE_PRIORITY_COLOR } from "@/constants/issue";
import { ISSUE_PRIORITIES } from "@/features/issue/schemas/create-issue.schema";
import type { IssuePriority } from "@/generated/prisma/client";

// Same shape/reuse reasoning as StatusBreakdownChart, ordered
// URGENT -> NONE to match the priority badge's existing severity order.
export function PriorityBreakdownChart({
  data,
}: {
  data: Record<IssuePriority, number>;
}) {
  const chartData = ISSUE_PRIORITIES.map((priority) => ({
    priority,
    count: data[priority],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: -16 }}>
        <XAxis dataKey="priority" tick={{ fontSize: 11 }} interval={0} />
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
            <Cell key={entry.priority} fill={ISSUE_PRIORITY_COLOR[entry.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
