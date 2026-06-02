import { CardSkeleton } from '@/components/common/skeletons/card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Layout-matching placeholder for the dashboard: hero line, a 4-up KPI grid,
// and a wider health/activity card row — mirrors the real grid so there is no
// layout shift when data resolves.
export function DashboardSkeleton({ className }: { className?: string } = {}): React.ReactElement {
  const kpis = [0, 1, 2, 3];
  return (
    <div className={cn('space-y-6', className)} role="status" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-surface-panel p-4 shadow-soft">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
