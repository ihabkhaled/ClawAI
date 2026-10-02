'use client';

import { Boxes, SearchX } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import type { ModelExposureEmptyProps } from '@/types/model-exposure.types';

/** No models synced at all, or none matching the current filters. */
export function ModelExposureEmpty({
  rowCount,
  onResetFilters,
  t,
}: ModelExposureEmptyProps): ReactElement {
  if (rowCount === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title={t('adminConnectors.exposureUi.emptyTitle')}
        description={t('adminConnectors.exposureUi.emptyDescription')}
      />
    );
  }
  return (
    <EmptyState
      icon={SearchX}
      title={t('adminConnectors.exposureUi.noMatchTitle')}
      action={
        <Button type="button" size="sm" variant="outline" onClick={onResetFilters}>
          {t('adminConnectors.exposureUi.clearFilters')}
        </Button>
      }
    />
  );
}
