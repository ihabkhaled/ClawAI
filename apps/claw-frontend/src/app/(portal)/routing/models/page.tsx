'use client';

import { Database } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
// `PageHeader` accepts { title, description?, actions? } — icon goes in the
// header description, not as a prop.
import { RouterModelDetailDrawer } from '@/components/routing/router-model-detail-drawer';
import { RouterModelRow } from '@/components/routing/router-model-row';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ROUTER_MODELS_LIFECYCLE_OPTIONS,
  ROUTER_MODELS_PROVIDER_OPTIONS,
} from '@/constants/router-models-page.constants';
import { useRouterModelsPage } from '@/hooks/routing/use-router-models-page';
import { useTranslation } from '@/lib/i18n';
import { toRouterModelRowDisplay } from '@/utilities/router-models-display.utility';

export default function RouterModelsPage(): ReactElement {
  const { t } = useTranslation();
  const { models, meta, isLoading, isError, filters, setFilter } = useRouterModelsPage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader title={t('routing.models.title')} description={t('routing.models.description')} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 max-md:basis-full">
              <Input
                placeholder="Search by name, modelKey, family"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>
            <Select value={filters.provider} onValueChange={(v) => setFilter('provider', v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('routing.models.filterByProvider')} />
              </SelectTrigger>
              <SelectContent>
                {ROUTER_MODELS_PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.lifecycle}
              onValueChange={(v) => setFilter('lifecycle', v as typeof filters.lifecycle)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('routing.models.filterByLifecycle')} />
              </SelectTrigger>
              <SelectContent>
                {ROUTER_MODELS_LIFECYCLE_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.isRouterOnly}
              onValueChange={(v) => setFilter('isRouterOnly', v as typeof filters.isRouterOnly)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Router-only" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All models</SelectItem>
                <SelectItem value="false">Execution only</SelectItem>
                <SelectItem value="true">Router only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <LoadingSpinner /> : null}
          {!isLoading && isError ? (
            <EmptyState
              icon={Database}
              title="Failed to load models"
              description="The registry endpoint returned an error. Check that claw-routing-service is healthy."
            />
          ) : null}
          {!isLoading && !isError && models.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No models yet"
              description="Run the seed scripts or trigger an upstream sync to populate the registry."
            />
          ) : null}
          {!isLoading && !isError && models.length > 0 ? (
            <div className="max-w-full">
              <table className="w-full border-collapse text-sm max-md:block">
                <thead className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase max-md:hidden">
                  <tr>
                    <th className="px-3 py-2">{t('routing.models.columnModelKey')}</th>
                    <th className="px-3 py-2">{t('routing.models.columnProvider')}</th>
                    <th className="px-3 py-2">{t('routing.models.columnLifecycle')}</th>
                    <th className="px-3 py-2">{t('routing.models.columnQuality')}</th>
                    <th className="px-3 py-2">{t('routing.models.columnCost')}</th>
                    <th className="px-3 py-2">{t('routing.models.columnLatency')}</th>
                    <th className="px-3 py-2">Privacy</th>
                  </tr>
                </thead>
                <tbody className="max-md:block max-md:space-y-3">
                  {models.map((m) => (
                    <RouterModelRow
                      key={m.id}
                      row={toRouterModelRowDisplay(m)}
                      onSelect={setSelectedId}
                    />
                  ))}
                </tbody>
              </table>
              {meta !== null ? (
                <p className="text-muted-foreground mt-3 text-xs">
                  {meta.total} total · page {meta.page} of {meta.totalPages}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <RouterModelDetailDrawer modelId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
