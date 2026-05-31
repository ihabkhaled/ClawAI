import { CardSkeleton } from '@/components/common/skeletons/card-skeleton';
import { ListRowSkeleton } from '@/components/common/skeletons/list-row-skeleton';
import { TableRowSkeleton } from '@/components/common/skeletons/table-row-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingStateVariant } from '@/enums/loading-state.enum';
import { cn } from '@/lib/utils';
import type { LoadingStateProps } from '@/types/component.types';

export function LoadingState({
  variant = LoadingStateVariant.Page,
  rows = 3,
  className,
  label,
}: LoadingStateProps): React.ReactElement {
  const items = Array.from({ length: Math.max(1, rows) }, (_value, index) => index);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('w-full space-y-4', className)}
    >
      {variant === LoadingStateVariant.Page ? (
        <>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        </>
      ) : null}

      {variant === LoadingStateVariant.Card ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {variant === LoadingStateVariant.List ? (
        <div className="space-y-2">
          {items.map((index) => (
            <ListRowSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {variant === LoadingStateVariant.Table ? (
        <div className="space-y-2 rounded-xl border p-4">
          {items.map((index) => (
            <TableRowSkeleton key={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
