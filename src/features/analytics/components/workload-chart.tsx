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
import type { WorkloadEntry } from "@/features/analytics/hooks/use-workspace-workload";

const BAR_HEIGHT = 36;
const MIN_HEIGHT = 120;

// Horizontal so member names stay readable regardless of count. Reuses
// ISSUE_PRIORITY_COLOR.NONE (the existing muted/neutral token) for the
// "Unassigned" bucket — same "no meaningful value" semantics as an
// issue with no priority — rather than inventing a new gray. Every real
// member shares the app's existing accent color; there's no per-member
// color system elsewhere in the app to draw from.
export function WorkloadChart({ data }: { data: WorkloadEntry[] }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(data.length * BAR_HEIGHT, MIN_HEIGHT)}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.userId ?? "unassigned"}
              fill={
                entry.userId === null ? ISSUE_PRIORITY_COLOR.NONE : "var(--color-primary)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
