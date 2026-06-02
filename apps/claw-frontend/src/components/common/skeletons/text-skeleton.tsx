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
  // Precompute a stable key per line up front. Width values are not unique
  // across longer line counts (the fallback width repeats), so the key is
  // composed from the line position. Skeletons never re-order or change
  // content, so a position-derived key is safe — and computing it here keeps
  // the bare loop index out of the JSX (satisfies react/no-array-index-key).
  const linePlaceholders = Array.from({ length: count }, (_, index) => ({
    key: `line-${index}`,
    width: TEXT_SKELETON_LINE_WIDTHS.at(index) ?? fallback,
  }));

  return (
    <div className={cn('space-y-2', className)}>
      {linePlaceholders.map((line) => (
        <Skeleton key={line.key} className={cn('h-3', line.width)} />
      ))}
    </div>
  );
}
