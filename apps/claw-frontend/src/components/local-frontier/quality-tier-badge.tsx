'use client';

import { QUALITY_TIER_BADGE } from '@/constants/local-frontier.constants';
import { type FrontierQualityTier } from '@/enums/local-frontier.enum';
import { cn } from '@/lib/utils';

interface QualityTierBadgeProps {
  tier: FrontierQualityTier;
  label: string;
}

export function QualityTierBadge({ tier, label }: QualityTierBadgeProps): React.ReactElement {
  const tone = QUALITY_TIER_BADGE[tier] ?? QUALITY_TIER_BADGE['BALANCED'];
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', tone)}
      aria-label={`Quality tier: ${label}`}
    >
      {label}
    </span>
  );
}
