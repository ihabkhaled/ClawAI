import type { ReactElement } from 'react';

import { FRESHNESS_BAND_CLASSNAME } from '../../constants/sync-health-ui.constants';
import { cn } from '../../lib/utils';
import type { StaleChipProps } from '../../types/sync-health-component.types';

export function StaleChip({ band, label }: StaleChipProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        FRESHNESS_BAND_CLASSNAME[band],
      )}
    >
      {label}
    </span>
  );
}
