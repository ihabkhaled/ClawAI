import { CardSkeleton } from '@/components/common/skeletons/card-skeleton';
import { cn } from '@/lib/utils';

// Generic responsive card-grid placeholder for card-based pages (connectors,
// models, memory, context packs). Mirrors the 1 / 2 / 3 column responsive grid
// those pages use so cards resolve in place.
export function CardGridSkeleton({
  count = 6,
  className,
}: { count?: number; className?: string } = {}): React.ReactElement {
  const items = Array.from({ length: Math.max(1, count) }, (_v, i) => i);
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      role="status"
      aria-busy="true"
    >
      {items.map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
