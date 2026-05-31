import { Skeleton } from '@/components/ui/skeleton';

export function ListRowSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-surface-panel p-3">
      <Skeleton className="h-9 w-9 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-7 w-16 rounded-md" />
    </div>
  );
}
