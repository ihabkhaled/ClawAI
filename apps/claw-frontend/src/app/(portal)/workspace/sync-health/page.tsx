'use client';

import { AlertTriangle, Plug } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { SyncHealthDashboardView } from '@/components/workspace/sync-health-dashboard';
import { useSyncHealthPage } from '@/hooks/workspace/use-sync-health-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceSyncHealthPage(): ReactElement {
  const { t } = useTranslation();
  const { dashboard, isLoading, error } = useSyncHealthPage();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader
          title={t('workspaceSync.dashboard.title')}
          description={t('workspaceSync.dashboard.description')}
        />
        <LoadingSpinner />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="p-6">
        <PageHeader
          title={t('workspaceSync.dashboard.title')}
          description={t('workspaceSync.dashboard.description')}
        />
        <EmptyState
          icon={AlertTriangle}
          title={t('workspaceSync.dashboard.error_title')}
          description={error.message}
        />
      </div>
    );
  }

  if (dashboard === undefined || dashboard.connectors.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title={t('workspaceSync.dashboard.title')}
          description={t('workspaceSync.dashboard.description')}
        />
        <EmptyState
          icon={Plug}
          title={t('workspaceSync.dashboard.empty_title')}
          description={t('workspaceSync.dashboard.empty_description')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t('workspaceSync.dashboard.title')}
        description={t('workspaceSync.dashboard.description')}
      />
      <SyncHealthDashboardView dashboard={dashboard} t={t} />
    </div>
  );
}
