'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PlanRow } from '@/components/admin/plans/plan-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { UserRole } from '@/enums';
import { usePlansPage } from '@/hooks/plans/use-plans-page';

export default function AdminPlansPage(): ReactElement {
  const {
    t,
    user,
    plans,
    isLoading,
    isError,
    error,
    pendingId,
    mutationError,
    clearMutationError,
    onActivate,
    onDeactivate,
    onSetDefault,
    onRetry,
  } = usePlansPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminPlans.title')}
        description={t('adminPlans.description')}
        actions={
          <Button asChild>
            <Link href={ROUTES.ADMIN_PLAN_NEW}>
              <Plus className="mr-1 h-4 w-4" />
              {t('adminPlans.addPlan')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminPlans.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminPlans.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {mutationError !== null ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{mutationError.message || t('adminPlans.mutationError')}</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearMutationError}>
            {t('common.close')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && plans.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('adminPlans.empty')}
        </p>
      ) : null}

      {plans.length > 0 ? (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              pendingId={pendingId}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onSetDefault={onSetDefault}
              onEditHref={ROUTES.ADMIN_PLAN_EDIT(plan.id)}
              onModelAccessHref={ROUTES.ADMIN_PLAN_MODEL_ACCESS(plan.id)}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
