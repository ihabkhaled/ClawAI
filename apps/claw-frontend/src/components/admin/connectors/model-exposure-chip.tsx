'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import {
  MODEL_EXPOSURE_BADGE_CLASSES,
  MODEL_EXPOSURE_LABEL_KEYS,
} from '@/constants/model-exposure.constants';
import type { ModelExposureChipProps } from '@/types/model-exposure.types';

/** Exposed / Unexposed, in the audited status palette (readable in dark mode). */
export function ModelExposureChip({ view, t }: ModelExposureChipProps): ReactElement {
  return (
    <StatusBadge
      status={t(MODEL_EXPOSURE_LABEL_KEYS[view.row.exposure])}
      className={MODEL_EXPOSURE_BADGE_CLASSES[view.row.exposure]}
    />
  );
}
