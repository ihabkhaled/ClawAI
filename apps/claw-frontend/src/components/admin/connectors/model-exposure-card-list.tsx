'use client';

import type { ReactElement } from 'react';

import { ModelExposureCard } from '@/components/admin/connectors/model-exposure-card';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModelExposureListProps } from '@/types/model-exposure.types';

/**
 * The touch layout: one card per model, one column on a phone and two from
 * `sm` (a tablet in either orientation). Hidden on a mouse, where the table
 * takes over.
 */
export function ModelExposureCardList({
  items,
  isSaving,
  selectAllState,
  onToggleSelectAll,
  onToggleRow,
  onExpose,
  onRequestUnexpose,
  t,
}: ModelExposureListProps): ReactElement {
  return (
    <div className="touch:flex hidden flex-col gap-2" data-testid="model-exposure-card-list">
      <label className="flex min-h-11 items-center gap-1 text-sm">
        <Checkbox checked={selectAllState} onCheckedChange={onToggleSelectAll} />
        <span>{t('adminConnectors.exposureUi.selectAllLabel')}</span>
      </label>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((view) => (
          <ModelExposureCard
            key={view.row.modelKey}
            view={view}
            isSaving={isSaving}
            onToggleRow={onToggleRow}
            onExpose={onExpose}
            onRequestUnexpose={onRequestUnexpose}
            t={t}
          />
        ))}
      </ul>
    </div>
  );
}
