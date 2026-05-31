import { Skeleton } from '@/components/ui/skeleton';
import { TEXT_SKELETON_LINE_WIDTHS } from '@/constants/skeleton.constants';
import { cn } from '@/lib/utils';
import type { TextSkeletonProps } from '@/types/component.types';

// Renders multiple shimmering text-line placeholders. Each line uses a
// progressively narrower width to approximate the natural cadence of prose
// (matches the visual feel of long-text loading states without looking like a
// stack of identical bars).
export function TextSkeleton({
  lines = 3,
  className,
}: TextSkeletonProps = {}): React.ReactElement {
  const count = Math.max(1, lines);
  const fallback = TEXT_SKELETON_LINE_WIDTHS.at(-1) ?? 'w-7/12';
  const widths = Array.from({ length: count }, (_, index) => {
    return TEXT_SKELETON_LINE_WIDTHS.at(index) ?? fallback;
  });

  return (
    <div className={cn('space-y-2', className)}>
      {widths.map((width, index) => (
        // Width values are not unique across longer line counts (fallback is
        // reused), so we compose a stable, index-derived key. Skeletons never
        // re-order or change content, so this is safe.
        <Skeleton key={`line-${index}`} className={cn('h-3', width)} />
      ))}
    </div>
  );
}
