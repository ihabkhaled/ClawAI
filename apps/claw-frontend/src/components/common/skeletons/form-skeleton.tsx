import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Placeholder for settings / form pages: a series of label + field pairs and a
// trailing submit button, matching the typical sectioned-card form layout.
export function FormSkeleton({
  fields = 4,
  className,
}: { fields?: number; className?: string } = {}): React.ReactElement {
  const rows = Array.from({ length: Math.max(1, fields) }, (_v, i) => i);
  return (
    <div className={cn('space-y-5', className)} role="status" aria-busy="true">
      {rows.map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}
