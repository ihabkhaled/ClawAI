'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { BillingDashboardContent } from '@/components/admin/billing/billing-dashboard-content';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums/user-role.enum';
import { useAdminBillingDashboard } from '@/hooks/admin/use-admin-billing-dashboard';

export default function AdminBillingPage(): ReactElement {
  const controller = useAdminBillingDashboard();
  if (controller.user && controller.user.role !== UserRole.ADMIN) {
    return <AccessDenied t={controller.t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={controller.t('adminBilling.title')}
        description={controller.t('adminBilling.description')}
      />
      {controller.isLoading ? (
        <p className="text-muted-foreground text-sm">{controller.t('adminBilling.loading')}</p>
      ) : null}
      {controller.isError ? (
        <div className="text-destructive flex items-center justify-between gap-3" role="alert">
          <span>{controller.error?.message ?? controller.t('adminBilling.error')}</span>
          <Button type="button" variant="outline" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError ? (
        <BillingDashboardContent {...controller} />
      ) : null}
    </div>
  );
}
