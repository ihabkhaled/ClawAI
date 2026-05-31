import { Skeleton } from '@/components/ui/skeleton';

export function CardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3 rounded-xl border bg-surface-panel p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}
