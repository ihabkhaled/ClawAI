'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PlanPriceEditor } from '@/components/admin/plans/plan-price-editor';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums/user-role.enum';
import { useAdminPlanPrices } from '@/hooks/plans/use-admin-plan-prices';

export default function AdminPlanPricesPage(): ReactElement {
  const controller = useAdminPlanPrices();

  if (controller.user && controller.user.role !== UserRole.ADMIN) {
    return <AccessDenied t={controller.t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={controller.t('billing.summary.price')}
        description={controller.plan?.name ?? controller.t('adminPlans.description')}
      />
      {controller.isLoading ? (
        <p className="text-muted-foreground text-sm">{controller.t('common.loading')}</p>
      ) : null}
      {controller.isError ? (
        <div className="text-destructive flex items-center justify-between gap-3" role="alert">
          <span>{controller.error?.message ?? controller.t('adminPlans.error')}</span>
          <Button type="button" variant="outline" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError ? <PlanPriceEditor {...controller} /> : null}
    </div>
  );
}
