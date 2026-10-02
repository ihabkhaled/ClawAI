'use client';

import type { ReactElement } from 'react';

import { ModelExposureBulkBar } from '@/components/admin/connectors/model-exposure-bulk-bar';
import { ModelExposureCardList } from '@/components/admin/connectors/model-exposure-card-list';
import { ModelExposureEmpty } from '@/components/admin/connectors/model-exposure-empty';
import { ModelExposureLoading } from '@/components/admin/connectors/model-exposure-loading';
import { ModelExposureTable } from '@/components/admin/connectors/model-exposure-table';
import { ModelExposureToolbar } from '@/components/admin/connectors/model-exposure-toolbar';
import { ModelBillingHelp } from '@/components/admin/model-billing/model-billing-help';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ListShowMore } from '@/components/common/list-show-more';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelExposurePanel } from '@/hooks/admin/use-model-exposure-panel';
import { cn } from '@/lib/utils';
import type { ModelExposureSectionProps } from '@/types';

/**
 * Which of a connector's models ClawAI offers. Cards on touch, a table with a
 * sticky header on a mouse, "Show more" paging for connectors with hundreds of
 * models, and a Credit / Included badge per model from the same connector
 * policy billing reads.
 */
export function ModelExposureSection({
  connectorId,
  showHeader = true,
}: ModelExposureSectionProps): ReactElement {
  const panel = useModelExposurePanel(connectorId);
  const { t } = panel;
  const pending = panel.unexposeConfirm.pending;

  return (
    // Labelled as a region so assistive tech, and the burn-in, can address this
    // table specifically; the page also renders a read-only model list.
    <Card
      data-testid="model-exposure-section"
      aria-label={t('adminConnectors.exposure.title')}
      className="min-w-0"
    >
      {showHeader ? (
        <CardHeader>
          <CardTitle className="text-lg">{t('adminConnectors.exposure.title')}</CardTitle>
          <p className="text-muted-foreground max-w-prose text-sm">
            {t('adminConnectors.exposure.description')}
          </p>
        </CardHeader>
      ) : null}
      <CardContent className={cn('flex min-w-0 flex-col gap-4', !showHeader && 'pt-6')}>
        <ModelBillingHelp isPolicyError={panel.isPolicyError} t={t} />
        <ModelExposureToolbar
          filters={panel.filters}
          exposedCount={panel.exposedCount}
          unexposedCount={panel.unexposedCount}
          hasActiveFilters={panel.hasActiveFilters}
          onSearchChange={panel.onSearchChange}
          onExposureFilterChange={panel.onExposureFilterChange}
          onSelectAllVisible={panel.onSelectAllVisible}
          onClearSelection={panel.onClearSelection}
          t={t}
        />
        {panel.errorMessage !== null ? (
          <p className="text-destructive text-sm" role="alert">
            {panel.errorMessage}
          </p>
        ) : null}
        <ModelExposureBulkBar
          selectedCount={panel.selectedCount}
          impact={panel.impact}
          isSaving={panel.isSaving}
          onApply={panel.onApply}
          onSelectAllVisible={panel.onSelectAllVisible}
          onClearSelection={panel.onClearSelection}
          t={t}
        />
        {panel.isLoading ? (
          <ModelExposureLoading label={t('adminConnectors.exposure.loading')} />
        ) : null}
        {!panel.isLoading && panel.items.length === 0 ? (
          <ModelExposureEmpty
            rowCount={panel.rowCount}
            onResetFilters={panel.onResetFilters}
            t={t}
          />
        ) : null}
        {!panel.isLoading && panel.items.length > 0 ? (
          <>
            <ModelExposureCardList
              items={panel.items}
              isSaving={panel.isSaving}
              selectAllState={panel.selectAllState}
              onToggleSelectAll={panel.onToggleSelectAll}
              onToggleRow={panel.onToggleRow}
              onExpose={panel.onExposeRow}
              onRequestUnexpose={panel.unexposeConfirm.request}
              t={t}
            />
            <ModelExposureTable
              items={panel.items}
              isSaving={panel.isSaving}
              selectAllState={panel.selectAllState}
              onToggleSelectAll={panel.onToggleSelectAll}
              onToggleRow={panel.onToggleRow}
              onExpose={panel.onExposeRow}
              onRequestUnexpose={panel.unexposeConfirm.request}
              t={t}
            />
            <ListShowMore
              shownCount={panel.items.length}
              totalCount={panel.filteredCount}
              hasMore={panel.hasMore}
              onShowMore={panel.onShowMore}
              showMoreLabel={t('adminConnectors.exposureUi.showMore')}
              shownLabel={t('adminConnectors.exposureUi.shownOf', {
                shown: panel.items.length,
                total: panel.filteredCount,
              })}
            />
          </>
        ) : null}
        <ConfirmDialog
          open={pending !== null}
          onOpenChange={panel.unexposeConfirm.onOpenChange}
          title={t('adminConnectors.exposureUi.unexposeConfirmTitle', {
            model: pending?.modelKey ?? '',
          })}
          description={t('adminConnectors.exposureUi.unexposeConfirmDescription')}
          confirmLabel={t('adminConnectors.exposureUi.unexposeOne')}
          cancelLabel={t('adminConnectors.exposureUi.cancel')}
          onConfirm={panel.unexposeConfirm.confirm}
          destructive
          isConfirming={panel.isSaving}
        />
      </CardContent>
    </Card>
  );
}
