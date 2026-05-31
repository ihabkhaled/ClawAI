'use client';

import { ArrowLeft } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { WorkspaceObjectDetail } from '@/components/workspace/workspace-object-detail';
import { useWorkspaceObjectDetailPage } from '@/hooks/workspace/use-workspace-object-detail-page';

export default function WorkspaceObjectDetailPage(): React.ReactElement {
  const ctrl = useWorkspaceObjectDetailPage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={ctrl.t('workspaceObjectDetail.title')}
        description={ctrl.t('workspaceObjectDetail.description')}
        actions={
          <Button variant="outline" size="sm" onClick={ctrl.onBack}>
            <ArrowLeft className="me-2 size-4" />
            {ctrl.t('common.back')}
          </Button>
        }
      />

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}

      {ctrl.isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {ctrl.t('workspaceObjectDetail.loadFailed')}
        </div>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.object !== undefined ? (
        <WorkspaceObjectDetail
          object={ctrl.object}
          isRefreshing={ctrl.isRefreshing}
          refreshError={ctrl.refreshError}
          onRefresh={ctrl.onRefresh}
          t={ctrl.t}
        />
      ) : null}
    </div>
  );
}
