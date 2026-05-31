import { ComponentSize } from '@/enums';

// Progressively narrower widths used by TextSkeleton to approximate the
// natural cadence of prose. The last entry is reused as a fallback when a
// caller asks for more lines than there are width tiers.
export const TEXT_SKELETON_LINE_WIDTHS: readonly string[] = [
  'w-full',
  'w-11/12',
  'w-10/12',
  'w-9/12',
  'w-8/12',
  'w-7/12',
];

// AvatarSkeleton diameter classes per ComponentSize. `md` matches the default
// `Avatar` primitive (h-10 w-10) so the placeholder is visually consistent
// with the post-load avatar.
export const AVATAR_SKELETON_SIZE_TO_CLASS: Record<ComponentSize, string> = {
  [ComponentSize.SM]: 'h-8 w-8',
  [ComponentSize.MD]: 'h-10 w-10',
  [ComponentSize.LG]: 'h-12 w-12',
};
