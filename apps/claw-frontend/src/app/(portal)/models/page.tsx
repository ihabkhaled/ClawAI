'use client';

import { Cpu, Scale, X } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ModelCardGrid } from '@/components/connectors/model-card-grid';
import { ModelCompareToolbar } from '@/components/connectors/model-compare-toolbar';
import { ModelFilterPills } from '@/components/connectors/model-filter-pills';
import { ModelTable } from '@/components/connectors/model-table';
import { ModelViewToggle } from '@/components/connectors/model-view-toggle';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER, LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { ConnectorProvider, ModelCatalogViewMode } from '@/enums';
import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useTranslation } from '@/lib/i18n';
import type { ActiveFilterPill } from '@/types';
import { showToast } from '@/utilities';

export default function ModelsPage() {
  const {
    models,
    totalModels,
    isLoading,
    isError,
    providerFilter,
    setProviderFilter,
    lifecycleFilter,
    setLifecycleFilter,
    viewMode,
    setViewMode,
    isCompareMode,
    toggleCompareMode,
    compareSelection,
    toggleCompareModel,
    clearCompareSelection,
    clearAllFilters,
    selectedModels,
  } = useAllModels();
  const { t } = useTranslation();

  // Active-filter pill list. Each pill carries its own `onClear` so we can
  // dismiss a single filter without nuking the whole filter bar — the
  // "Clear all" CTA inside ModelFilterPills handles the all-at-once case.
  const activeFilterPills = useMemo<ActiveFilterPill[]>(() => {
    const pills: ActiveFilterPill[] = [];
    if (providerFilter !== null) {
      pills.push({
        id: 'provider',
        label: t('models.filters.providerPill', {
          value: PROVIDER_DISPLAY_NAMES[providerFilter] ?? providerFilter,
        }),
        onClear: () => setProviderFilter(null),
      });
    }
    if (lifecycleFilter !== '') {
      pills.push({
        id: 'lifecycle',
        label: t('models.filters.lifecyclePill', {
          value: LIFECYCLE_LABELS[lifecycleFilter] ?? lifecycleFilter,
        }),
        onClear: () => setLifecycleFilter(''),
      });
    }
    return pills;
  }, [providerFilter, lifecycleFilter, setProviderFilter, setLifecycleFilter, t]);

  const selectedLabels = useMemo(() => selectedModels.map((m) => m.displayName), [selectedModels]);

  const handleCompare = (): void => {
    // No compare-modal/page is wired yet; we surface a toast so the
    // interaction is testable end-to-end without a route change. The page
    // already passes the selection IDs to the parent — wiring a real compare
    // destination is a separate slice.
    showToast.info({
      title: t('models.compare.compareCta', { count: selectedModels.length }),
      description: selectedLabels.join(', '),
    });
  };

  if (isError) {
    return (
      <div>
        <PageHeader title={t('models.title')} description={t('models.description')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">{t('models.loadFailed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('models.title')} description={t('models.description')} />

      {isLoading && <LoadingSpinner label={t('models.loadingModels')} />}

      {!isLoading && totalModels === 0 && (
        <EmptyState
          icon={Cpu}
          title={t('models.noModels')}
          description={t('models.noModelsDesc')}
        />
      )}

      {!isLoading && totalModels > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={providerFilter ?? ALL_FILTER}
              onValueChange={(value) =>
                setProviderFilter(value === ALL_FILTER ? null : (value as ConnectorProvider))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('models.allProviders')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t('models.allProviders')}</SelectItem>
                {Object.values(ConnectorProvider).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_DISPLAY_NAMES[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lifecycleFilter || ALL_FILTER}
              onValueChange={(value) => setLifecycleFilter(value === ALL_FILTER ? '' : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('models.allLifecycle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t('models.allLifecycle')}</SelectItem>
                {Object.keys(LIFECYCLE_LABELS).map((l) => (
                  <SelectItem key={l} value={l}>
                    {LIFECYCLE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ms-auto flex items-center gap-2">
              <Button
                type="button"
                variant={isCompareMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={toggleCompareMode}
              >
                {isCompareMode ? (
                  <>
                    <X className="me-1 h-4 w-4" />
                    {t('models.compare.cancel')}
                  </>
                ) : (
                  <>
                    <Scale className="me-1 h-4 w-4" />
                    {t('models.compare.enable')}
                  </>
                )}
              </Button>
              <ModelViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <ModelFilterPills pills={activeFilterPills} onClearAll={clearAllFilters} />

          {isCompareMode ? (
            <ModelCompareToolbar
              selectedCount={selectedModels.length}
              selectedLabels={selectedLabels}
              onClear={clearCompareSelection}
              onCompare={handleCompare}
              canCompare={selectedModels.length >= 2}
            />
          ) : null}

          {viewMode === ModelCatalogViewMode.GRID ? (
            <ModelCardGrid
              models={models}
              emptyMessage={t('models.noModelsMatch')}
              compareSelection={isCompareMode ? compareSelection : undefined}
              onToggleCompare={isCompareMode ? toggleCompareModel : undefined}
            />
          ) : (
            <ModelTable
              models={models}
              showProvider
              emptyMessage={t('models.noModelsMatch')}
              compareSelection={isCompareMode ? compareSelection : undefined}
              onToggleCompare={isCompareMode ? toggleCompareModel : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
