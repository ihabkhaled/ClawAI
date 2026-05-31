import { Skeleton } from '@/components/ui/skeleton';
import { AVATAR_SKELETON_SIZE_TO_CLASS } from '@/constants/skeleton.constants';
import { ComponentSize } from '@/enums';
import { cn } from '@/lib/utils';
import type { AvatarSkeletonProps } from '@/types/component.types';

// Round shimmering placeholder used while the real Avatar image / fallback is
// loading. Size mirrors the shared ComponentSize enum so the placeholder lines
// up with the post-load Avatar.
export function AvatarSkeleton({
  size = ComponentSize.MD,
  className,
}: AvatarSkeletonProps = {}): React.ReactElement {
  return (
    <Skeleton
      className={cn('rounded-full', AVATAR_SKELETON_SIZE_TO_CLASS[size], className)}
    />
  );
}
