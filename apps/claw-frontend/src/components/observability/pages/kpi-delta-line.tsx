import type { ReactElement } from 'react';

import { DELTA_ICONS } from '@/constants/observability-pages.constants';
import type { DeltaLineProps } from '@/types/observability-pages.types';
import { changeDirection, formatChange } from '@/utilities/observability-pages.utility';

/**
 * The change against the previous period. The direction is an icon AND a word
 * for assistive tech, and the colour is neutral: more cost is not "good" or "bad".
 */
export function KpiDeltaLine({ delta, t }: DeltaLineProps): ReactElement {
  const direction = changeDirection(delta);
  const Icon = DELTA_ICONS[direction];
  return (
    <p className="text-muted-foreground flex items-center gap-1 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">{t(`observabilityPages.change_${direction}`)} </span>
        {t('observabilityPages.vsPrevious', { change: formatChange(delta) })}
      </span>
    </p>
  );
}
