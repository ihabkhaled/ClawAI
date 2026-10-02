'use client';

import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MODEL_EXPOSURE_FILTER_LABEL_KEYS,
  MODEL_EXPOSURE_FILTER_OPTIONS,
} from '@/constants/model-exposure.constants';
import type { ModelExposureFilterSelectProps } from '@/types/model-exposure.types';
import { toModelExposureFilterOption } from '@/utilities/model-exposure.utility';

/** All / Exposed only / Unexposed only, on the design-system Select. */
export function ModelExposureFilterSelect({
  exposedOnly,
  onChange,
  triggerClassName,
  t,
}: ModelExposureFilterSelectProps): ReactElement {
  return (
    <Select value={toModelExposureFilterOption(exposedOnly)} onValueChange={onChange}>
      <SelectTrigger
        className={triggerClassName}
        aria-label={t('adminConnectors.exposureUi.filterLabel')}
        data-testid="model-exposure-filter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODEL_EXPOSURE_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(MODEL_EXPOSURE_FILTER_LABEL_KEYS[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
