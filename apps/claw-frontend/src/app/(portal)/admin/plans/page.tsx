'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PlanRow } from '@/components/admin/plans/plan-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
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
    retirementCandidate,
    onRequestRetirement,
    onCancelRetirement,
    onConfirmRetirement,
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
        <p className="text-muted-foreground text-sm">{t('adminPlans.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
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
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <span>{mutationError.message || t('adminPlans.mutationError')}</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearMutationError}>
            {t('common.close')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && plans.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
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
              onRetire={(id, name) => onRequestRetirement({ id, name })}
              onEditHref={ROUTES.ADMIN_PLAN_EDIT(plan.id)}
              onModelAccessHref={ROUTES.ADMIN_PLAN_MODEL_ACCESS(plan.id)}
              onPricesHref={ROUTES.ADMIN_PLAN_PRICES(plan.id)}
              t={t}
            />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={retirementCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCancelRetirement();
          }
        }}
        title={t('common.confirm')}
        description={
          retirementCandidate === null
            ? undefined
            : `${t('common.delete')}: ${retirementCandidate.name}`
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={onConfirmRetirement}
        isConfirming={retirementCandidate !== null && pendingId === retirementCandidate.id}
      />
    </div>
  );
}
