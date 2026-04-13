import { COST_TIER_STYLES } from '@/constants';
import { cn } from '@/lib/utils';
import type { CostTierBadgeProps } from '@/types';

export function CostTierBadge({ tier, label }: CostTierBadgeProps) {
  const style = COST_TIER_STYLES[tier] ?? COST_TIER_STYLES['single'];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        style,
      )}
    >
      {label}
    </span>
  );
}
