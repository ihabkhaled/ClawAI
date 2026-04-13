import { Badge } from '@/components/ui/badge';
import { OUTCOME_LABEL_BADGE_VARIANTS } from '@/constants';
import type { ReplayOutcomeBadgeProps } from '@/types';

export function ReplayOutcomeBadge({
  outcomeLabel,
  t,
}: ReplayOutcomeBadgeProps): React.ReactElement {
  const variant = OUTCOME_LABEL_BADGE_VARIANTS[outcomeLabel];
  const key = `replay.${outcomeLabel}` as const;

  return <Badge variant={variant}>{t(key)}</Badge>;
}
