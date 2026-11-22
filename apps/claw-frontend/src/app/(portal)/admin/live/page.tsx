'use client';

import type { ReactElement } from 'react';

import { AdminLiveOverview } from '@/components/admin/live/admin-live-overview';
import { AdminLivePolicyForm } from '@/components/admin/live/admin-live-policy-form';
import { AdminLivePolicyVersions } from '@/components/admin/live/admin-live-policy-versions';
import { PageHeader } from '@/components/common/page-header';
import { useAdminLive } from '@/hooks/admin/live/use-admin-live';

/** Live Intelligence admin (ADMIN_LIVE_MANAGE, gated by ROUTE_PERMISSIONS). */
export default function AdminLivePage(): ReactElement {
  const controller = useAdminLive();
  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <PageHeader
        title={controller.t('live.admin.title')}
        description={controller.t('live.admin.description')}
      />
      <AdminLiveOverview controller={controller} />
      <AdminLivePolicyForm controller={controller} />
      <AdminLivePolicyVersions controller={controller} />
    </div>
  );
}
