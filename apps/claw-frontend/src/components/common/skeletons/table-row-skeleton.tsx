import { Skeleton } from '@/components/ui/skeleton';

export function TableRowSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/5" />
      <Skeleton className="ms-auto h-4 w-16" />
    </div>
  );
}
