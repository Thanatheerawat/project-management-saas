import { Skeleton } from "@/components/ui/skeleton";

// Shaped like the page it stands in for (header, KPI row, project list,
// activity, overview) so the swap-in on real content doesn't jump —
// Increment 3's "replace blank pages with skeletons" requirement, scoped
// to this one route since it's the only page this increment touches.
export default function WorkspaceDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-32 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56 sm:col-span-2" />
        </div>
      </div>
    </div>
  );
}
