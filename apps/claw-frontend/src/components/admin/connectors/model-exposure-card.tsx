'use client';

import type { ReactElement } from 'react';

import { ModelExposureChip } from '@/components/admin/connectors/model-exposure-chip';
import { ModelExposureRowActions } from '@/components/admin/connectors/model-exposure-row-actions';
import { ModelLifecycleChip } from '@/components/admin/connectors/model-lifecycle-chip';
import { ModelBillingBadge } from '@/components/admin/model-billing/model-billing-badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModelExposureCardProps } from '@/types/model-exposure.types';

/** One model on touch: name, provider, status chips, a 44px checkbox and a menu. */
export function ModelExposureCard({
  view,
  isSaving,
  onToggleRow,
  onExpose,
  onRequestUnexpose,
  t,
}: ModelExposureCardProps): ReactElement {
  return (
    <li
      className="bg-surface-panel data-[selected=true]:border-primary relative flex min-w-0 flex-col gap-2 rounded-lg border p-3"
      data-selected={view.isSelected}
      data-testid="model-exposure-card"
    >
      <div className="flex min-w-0 items-start gap-1">
        <Checkbox
          checked={view.isSelected}
          onCheckedChange={() => onToggleRow(view.row.modelKey)}
          aria-label={t('adminConnectors.exposureUi.selectRowLabel', {
            model: view.row.modelKey,
          })}
        />
        <div className="min-w-0 flex-1 pt-2">
          <p className="text-sm font-medium break-words">{view.row.displayName}</p>
          <p className="text-muted-foreground font-mono text-xs break-all">{view.row.modelKey}</p>
          <p className="text-muted-foreground text-xs">{view.providerLabel}</p>
        </div>
        <ModelExposureRowActions
          view={view}
          isSaving={isSaving}
          onExpose={onExpose}
          onRequestUnexpose={onRequestUnexpose}
          t={t}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ModelExposureChip view={view} t={t} />
        <ModelLifecycleChip view={view} t={t} />
        <ModelBillingBadge billing={view.billing} t={t} />
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-1 text-xs">
        <span>{t('adminConnectors.exposure.colLastSeen')}</span>
        <bdi>{view.lastSeenLabel ?? t('adminConnectors.exposure.neverSeen')}</bdi>
      </p>
    </li>
  );
}
