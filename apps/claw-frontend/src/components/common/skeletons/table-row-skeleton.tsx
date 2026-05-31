import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TableRowSkeletonProps } from '@/types/component.types';

// Renders one shimmering table row. The `cols` prop drives column count; the
// historical zero-arg call sites (loading-state) keep working because cols
// defaults to 4 and matches the prior layout (last column right-aligned).
export function TableRowSkeleton({
  cols = 4,
  className,
}: TableRowSkeletonProps = {}): React.ReactElement {
  const columns = Array.from({ length: Math.max(1, cols) }, (_, index) => index);
  const lastIndex = columns.length - 1;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {columns.map((index) => {
        const isLast = index === lastIndex;
        const widthClass = isLast ? 'ms-auto w-16' : 'w-1/4';
        return <Skeleton key={index} className={cn('h-4', widthClass)} />;
      })}
    </div>
  );
}
