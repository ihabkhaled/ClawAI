'use client';

import { Cpu, Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ModelCardGrid } from '@/components/connectors/model-card-grid';
import { ModelCompareToolbar } from '@/components/connectors/model-compare-toolbar';
import { ModelFilterPills } from '@/components/connectors/model-filter-pills';
import { ModelTable } from '@/components/connectors/model-table';
import { ModelViewToggle } from '@/components/connectors/model-view-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_FILTER, LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { ConnectorProvider, ModelCatalogViewMode } from '@/enums';
import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useTranslation } from '@/lib/i18n';
import type { ActiveFilterPill } from '@/types';

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
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);

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

  const selectedLabels = useMemo(() => selectedModels.map((model) => model.displayName), [selectedModels]);

  const handleCompare = (): void => {
    if (selectedModels.length >= 2) setIsCompareDialogOpen(true);
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
        <EmptyState icon={Cpu} title={t('models.noModels')} description={t('models.noModelsDesc')} />
      )}

      {!isLoading && totalModels > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Select
              value={providerFilter ?? ALL_FILTER}
              onValueChange={(value) =>
                setProviderFilter(value === ALL_FILTER ? null : (value as ConnectorProvider))
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('models.allProviders')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t('models.allProviders')}</SelectItem>
                {Object.values(ConnectorProvider).map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {PROVIDER_DISPLAY_NAMES[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lifecycleFilter || ALL_FILTER}
              onValueChange={(value) => setLifecycleFilter(value === ALL_FILTER ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('models.allLifecycle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t('models.allLifecycle')}</SelectItem>
                {Object.keys(LIFECYCLE_LABELS).map((lifecycle) => (
                  <SelectItem key={lifecycle} value={lifecycle}>
                    {LIFECYCLE_LABELS[lifecycle]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
              <Button
                type="button"
                variant={isCompareMode ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 sm:flex-none"
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

      <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('models.compare.compareCta', { count: selectedModels.length })}</DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {selectedModels.map((model) => (
              <section key={model.id} className="min-w-0 rounded-lg border bg-card p-4">
                <h3 className="break-words font-semibold">{model.displayName}</h3>
                <p className="mt-1 break-all text-xs text-muted-foreground">{model.modelKey}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}</Badge>
                  <Badge variant="secondary">{LIFECYCLE_LABELS[model.lifecycle] ?? model.lifecycle}</Badge>
                  {model.supportsStreaming ? <Badge variant="outline">{t('models.streaming')}</Badge> : null}
                  {model.supportsTools ? <Badge variant="outline">{t('models.tools')}</Badge> : null}
                  {model.supportsVision ? <Badge variant="outline">{t('models.vision')}</Badge> : null}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
