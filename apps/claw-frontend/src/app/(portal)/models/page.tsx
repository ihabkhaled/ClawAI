'use client';

import { Cpu } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ModelTable } from '@/components/connectors/model-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER, LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { ConnectorProvider } from '@/enums';
import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useTranslation } from '@/lib/i18n';

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
  } = useAllModels();
  const { t } = useTranslation();

  if (isError) {
    return (
      <div>
        <PageHeader
          title={t('models.title')}
          description={t('models.description')}
        />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">Failed to load models.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('models.title')}
        description={t('models.description')}
      />

      {isLoading && <LoadingSpinner label="Loading models..." />}

      {!isLoading && totalModels === 0 && (
        <EmptyState
          icon={Cpu}
          title="No models synced"
          description="Models will appear here once you configure a connector and sync its available models."
        />
      )}

      {!isLoading && totalModels > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Select
              value={providerFilter ?? ALL_FILTER}
              onValueChange={(value) =>
                setProviderFilter(value === ALL_FILTER ? null : (value as ConnectorProvider))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All providers</SelectItem>
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
                <SelectValue placeholder="All lifecycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All lifecycle</SelectItem>
                {Object.keys(LIFECYCLE_LABELS).map((l) => (
                  <SelectItem key={l} value={l}>
                    {LIFECYCLE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ModelTable
            models={models}
            showProvider
            emptyMessage="No models match the current filters."
          />
        </div>
      )}
    </div>
  );
}
