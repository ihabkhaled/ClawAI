'use client';

import type { ReactElement } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { MODEL_EXPOSURE_SKELETON_ROWS } from '@/constants/model-exposure.constants';
import type { ModelExposureLoadingProps } from '@/types/model-exposure.types';

/** Row-shaped placeholders while the connector's models load. */
export function ModelExposureLoading({ label }: ModelExposureLoadingProps): ReactElement {
  return (
    <div
      className="flex flex-col gap-2"
      role="status"
      aria-label={label}
      data-testid="model-exposure-loading"
    >
      {MODEL_EXPOSURE_SKELETON_ROWS.map((index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
