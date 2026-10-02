'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import type { ModelExposureChipProps } from '@/types/model-exposure.types';

/** The provider's lifecycle, translated; an unknown value is shown as sent. */
export function ModelLifecycleChip({ view, t }: ModelExposureChipProps): ReactElement {
  return (
    <StatusBadge
      status={view.lifecycleLabelKey === null ? view.row.lifecycle : t(view.lifecycleLabelKey)}
      className={view.lifecycleBadgeClass}
    />
  );
}
