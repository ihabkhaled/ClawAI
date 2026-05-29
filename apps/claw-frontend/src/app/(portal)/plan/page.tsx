'use client';

import type { ReactElement } from 'react';

import { AllowedModelsList } from '@/components/account/allowed-models-list';
import { PlanCard } from '@/components/account/plan-card';
import { UsageMeter } from '@/components/account/usage-meter';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlanPage } from '@/hooks/plans/use-plan-page';

export default function PlanPage(): ReactElement {
  const { t, entitlements, isLoading, isError, error, onRetry } = usePlanPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('userPlan.title')} description={t('userPlan.description')} />

      {isLoading ? <p className="text-sm text-muted-foreground">{t('userPlan.loading')}</p> : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('userPlan.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && entitlements === null ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('userPlan.empty')}
        </p>
      ) : null}

      {!isLoading && !isError && entitlements !== null ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {entitlements.plan !== null ? (
            <PlanCard plan={entitlements.plan} t={t} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('userPlan.noPlanTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('userPlan.noPlanDescription')}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('userPlan.dailyQuota')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageMeter quota={entitlements.quota} t={t} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{t('userPlan.allowedModels')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AllowedModelsList models={entitlements.allowedModels} t={t} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
