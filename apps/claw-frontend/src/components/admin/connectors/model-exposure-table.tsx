'use client';

import type { ReactElement } from 'react';

import { ModelExposureChip } from '@/components/admin/connectors/model-exposure-chip';
import { ModelExposureRowActions } from '@/components/admin/connectors/model-exposure-row-actions';
import { ModelLifecycleChip } from '@/components/admin/connectors/model-lifecycle-chip';
import { ModelBillingBadge } from '@/components/admin/model-billing/model-billing-badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModelExposureListProps } from '@/types/model-exposure.types';

/**
 * The mouse layout: a real table in its own scroll region, so the header row
 * sticks while the rows scroll. Hidden on touch, where the card list takes
 * over (the same `touch:` switch ResponsiveTable uses). Headers are
 * `text-start` so they follow the cells in RTL.
 */
export function ModelExposureTable({
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
    <div
      className="touch:hidden block max-h-[70vh] overflow-auto rounded-md border"
      data-testid="model-exposure-table"
    >
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-muted text-muted-foreground sticky top-0 z-10 text-xs">
          <tr className="text-start">
            <th scope="col" className="w-10 px-3 py-2 text-start">
              <Checkbox
                checked={selectAllState}
                onCheckedChange={onToggleSelectAll}
                aria-label={t('adminConnectors.exposureUi.selectAllLabel')}
              />
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposure.colModel')}
            </th>
            <th scope="col" className="w-36 px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposure.colProvider')}
            </th>
            <th scope="col" className="w-28 px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposureUi.colBilling')}
            </th>
            <th scope="col" className="w-28 px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposure.colExposure')}
            </th>
            <th scope="col" className="w-28 px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposure.colLifecycle')}
            </th>
            <th scope="col" className="w-44 px-3 py-2 text-start font-medium">
              {t('adminConnectors.exposure.colLastSeen')}
            </th>
            <th scope="col" className="w-14 px-3 py-2 text-end font-medium">
              <span className="sr-only">{t('adminConnectors.exposureUi.colActions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((view) => (
            <tr
              key={view.row.modelKey}
              className="data-[selected=true]:bg-muted/50 border-b last:border-0"
              data-selected={view.isSelected}
            >
              <td className="px-3 py-2 align-top">
                <Checkbox
                  checked={view.isSelected}
                  onCheckedChange={() => onToggleRow(view.row.modelKey)}
                  aria-label={t('adminConnectors.exposureUi.selectRowLabel', {
                    model: view.row.modelKey,
                  })}
                />
              </td>
              <td className="min-w-0 px-3 py-2 align-top">
                {/* Two providers can offer the same display name; the operator
                    needs the identity that actually executes. */}
                <span className="block font-medium break-words">{view.row.displayName}</span>
                <span className="text-muted-foreground block font-mono text-xs break-all">
                  {view.row.modelKey}
                </span>
              </td>
              <td className="px-3 py-2 align-top">{view.providerLabel}</td>
              <td className="px-3 py-2 align-top">
                <ModelBillingBadge billing={view.billing} t={t} />
              </td>
              <td className="px-3 py-2 align-top">
                <ModelExposureChip view={view} t={t} />
              </td>
              <td className="px-3 py-2 align-top">
                <ModelLifecycleChip view={view} t={t} />
              </td>
              <td className="text-muted-foreground px-3 py-2 align-top text-xs">
                {view.lastSeenLabel ?? t('adminConnectors.exposure.neverSeen')}
              </td>
              <td className="px-3 py-1 text-end align-top">
                <ModelExposureRowActions
                  view={view}
                  isSaving={isSaving}
                  onExpose={onExpose}
                  onRequestUnexpose={onRequestUnexpose}
                  t={t}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
