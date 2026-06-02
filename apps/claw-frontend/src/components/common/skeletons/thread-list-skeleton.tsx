import { ListRowSkeleton } from '@/components/common/skeletons/list-row-skeleton';
import { cn } from '@/lib/utils';

// Placeholder for the chat thread list (and any avatar+title+meta list). Rows
// default to 6 to fill a typical viewport without over-drawing.
export function ThreadListSkeleton({
  rows = 6,
  className,
}: { rows?: number; className?: string } = {}): React.ReactElement {
  const items = Array.from({ length: Math.max(1, rows) }, (_v, i) => i);
  return (
    <div className={cn('space-y-2', className)} role="status" aria-busy="true">
      {items.map((i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}
