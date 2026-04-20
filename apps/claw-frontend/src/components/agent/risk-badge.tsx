import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { RISK_BADGE_VARIANTS } from '@/constants/risk-badge.constants';
import type { RiskBadgeProps } from '@/types/device-component.types';

export function RiskBadge({ label, score }: RiskBadgeProps): ReactElement {
  return (
    <Badge variant={RISK_BADGE_VARIANTS[label]} className="font-mono text-xs">
      {label} ({score})
    </Badge>
  );
}
