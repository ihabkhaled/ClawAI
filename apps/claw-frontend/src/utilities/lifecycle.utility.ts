import { BadgeVariant, ModelLifecycle } from '@/enums';

/**
 * Get the appropriate badge variant for a model lifecycle status.
 */
export function getLifecycleBadgeVariant(lifecycle: string): BadgeVariant {
  switch (lifecycle) {
    case ModelLifecycle.GA:
      return BadgeVariant.DEFAULT;
    case ModelLifecycle.PREVIEW:
    case ModelLifecycle.BETA:
      return BadgeVariant.SECONDARY;
    case ModelLifecycle.DEPRECATED:
      return BadgeVariant.DESTRUCTIVE;
    default:
      return BadgeVariant.OUTLINE;
  }
}
