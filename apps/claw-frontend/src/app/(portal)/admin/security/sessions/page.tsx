'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { GlobalSessionActionsCard } from '@/components/admin/sessions/global-session-actions-card';
import { PageHeader } from '@/components/common/page-header';
import { useSecuritySessionsPage } from '@/hooks/admin/use-security-sessions-page';

export default function AdminSecuritySessionsPage(): ReactElement {
  const page = useSecuritySessionsPage();

  if (page.isDenied) {
    return <AccessDenied t={page.t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={page.t('adminSessions.globalTitle')}
        description={page.t('adminSessions.globalDescription')}
      />
      {page.isSuperAdmin ? <GlobalSessionActionsCard guard={page.guard} t={page.t} /> : null}
    </div>
  );
}
