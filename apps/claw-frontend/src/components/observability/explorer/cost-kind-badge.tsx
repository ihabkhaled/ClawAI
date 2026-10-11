import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  COST_KIND_BADGE_CLASSES,
  COST_KIND_LABEL_KEYS,
  COST_KIND_TIP_KEYS,
} from '@/constants/observability-explorer.constants';
import { cn } from '@/lib/utils';
import type { CostKindBadgeProps } from '@/types/observability-explorer.types';

/**
 * Says how far a cost figure can be trusted: priced, estimated (fallback),
 * no price on file, or unmetered (admin). The tooltip text is also in the
 * accessibility tree, so it is not hover-only.
 */
export function CostKindBadge({ kind, partial = false, t }: CostKindBadgeProps): ReactElement {
  const tip = partial
    ? `${t(COST_KIND_TIP_KEYS[kind])} ${t('observabilityExplorer.costPartial')}`
    : t(COST_KIND_TIP_KEYS[kind]);
  return (
    <Badge
      variant="outline"
      title={tip}
      className={cn('whitespace-nowrap', COST_KIND_BADGE_CLASSES[kind])}
      data-cost-kind={kind}
    >
      {t(COST_KIND_LABEL_KEYS[kind])}
      {partial ? <span aria-hidden="true">*</span> : null}
      <span className="sr-only">{tip}</span>
    </Badge>
  );
}
