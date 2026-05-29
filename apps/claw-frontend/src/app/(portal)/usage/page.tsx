'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { UsageMeter } from '@/components/account/usage-meter';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes.constants';
import { useUsagePage } from '@/hooks/plans/use-usage-page';

export default function UsagePage(): ReactElement {
  const { t, entitlements, isLoading, isError, error, onRetry } = useUsagePage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('userUsage.title')}
        description={t('userUsage.description')}
        actions={
          <Button asChild variant="outline">
            <Link href={ROUTES.PLAN}>{t('userUsage.viewPlan')}</Link>
          </Button>
        }
      />

      {isLoading ? <p className="text-sm text-muted-foreground">{t('userUsage.loading')}</p> : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('userUsage.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && entitlements === null ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('userUsage.empty')}
        </p>
      ) : null}

      {!isLoading && !isError && entitlements !== null ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg">{t('userUsage.cardTitle')}</CardTitle>
            <CardDescription>
              {entitlements.plan !== null
                ? t('userUsage.onPlan', { plan: entitlements.plan.name })
                : t('userUsage.noPlan')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageMeter quota={entitlements.quota} t={t} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
