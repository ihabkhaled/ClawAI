'use client';

import { CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { ModelCostAttentionBanner } from '@/components/admin/model-costs/model-cost-attention-banner';
import { ModelCostEditDialog } from '@/components/admin/model-costs/model-cost-edit-dialog';
import { ModelCostFilterBar } from '@/components/admin/model-costs/model-cost-filter-bar';
import { ModelCostTable } from '@/components/admin/model-costs/model-cost-table';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { ModelPricingSource } from '@/enums/model-pricing-source.enum';
import { useModelCostsPage } from '@/hooks/admin/use-model-costs-page';

export default function AdminModelCostsPage(): ReactElement {
  const controller = useModelCostsPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={controller.t('adminModelCosts.title')}
        description={controller.t('adminModelCosts.description')}
      />

      <ModelCostAttentionBanner
        fallbackCount={controller.counts[ModelPricingSource.PROVIDER_FALLBACK]}
        unpricedCount={controller.counts[ModelPricingSource.UNPRICED]}
        t={controller.t}
      />

      <ModelCostFilterBar
        sourceFilter={controller.sourceFilter}
        counts={controller.counts}
        totalCount={controller.totalCount}
        search={controller.search}
        onSourceFilterChange={controller.onSourceFilterChange}
        onSearchChange={controller.onSearchChange}
        t={controller.t}
      />

      {controller.isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {controller.isError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <span>{controller.error?.message ?? controller.t('adminModelCosts.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={controller.onRetry}>
            {controller.t('adminModelCosts.retry')}
          </Button>
        </div>
      ) : null}

      {!controller.isLoading && !controller.isError && controller.totalCount === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title={controller.t('adminModelCosts.empty.title')}
          description={controller.t('adminModelCosts.empty.description')}
          // An empty registry is an OPERATOR condition, not "there are no
          // models" — it means discovery has never run. A production install
          // sat here with every price blank and every paid model refused,
          // because the old copy implied the sync was automatic and offered
          // nowhere to go.
          action={
            <Button asChild size="sm">
              <Link href={ROUTES.MODELS_DISCOVERY}>
                {controller.t('adminModelCosts.empty.action')}
              </Link>
            </Button>
          }
        />
      ) : null}

      {!controller.isLoading && !controller.isError && controller.totalCount > 0 ? (
        <ModelCostTable rows={controller.rows} onEdit={controller.onEdit} t={controller.t} />
      ) : null}

      <ModelCostEditDialog
        open={controller.isDialogOpen}
        row={controller.editing}
        isSubmitting={controller.isPublishing}
        submitError={controller.publishError}
        onOpenChange={controller.onDialogOpenChange}
        onSubmit={controller.onSubmit}
        t={controller.t}
      />
    </div>
  );
}
