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

  const selectedLabels = useMemo(
    () => selectedModels.map((model) => model.displayName),
    [selectedModels],
  );

  const handleCompare = (): void => {
    if (selectedModels.length >= 2) {
      setIsCompareDialogOpen(true);
    }
  };

  if (isError) {
    return (
      <div>
        <PageHeader title={t('models.title')} description={t('models.description')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive text-sm">{t('models.loadFailed')}</p>
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
              compareSelection={isCompareMode ? compareSelection : undefined}
              onToggleCompare={isCompareMode ? toggleCompareModel : undefined}
            />
          )}
        </div>
      )}

      <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('nav.compareModels')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedModels.map((model) => (
              <div
                key={`${model.provider}-${model.modelKey}`}
                className="min-w-0 rounded-lg border p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{model.displayName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {model.lifecycle}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-3 space-y-1 text-sm">
                  <p className="break-words">{model.modelKey}</p>
                  {model.maxContextTokens ? (
                    <p>{model.maxContextTokens.toLocaleString()} context</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
