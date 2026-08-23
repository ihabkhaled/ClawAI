'use client';

import { RefreshCw } from 'lucide-react';

import { AccessDenied } from '@/components/admin/access-denied';
import { DeploymentControlPanel } from '@/components/admin/deployment/deployment-control-panel';
import { DeploymentCredentialsCard } from '@/components/admin/deployment/deployment-credentials-card';
import { DeploymentRunProgressCard } from '@/components/admin/deployment/deployment-run-progress-card';
import { DeploymentStatusContent } from '@/components/admin/deployment/deployment-status-content';
import { DeploymentTroubleshootingCard } from '@/components/admin/deployment/deployment-troubleshooting-card';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useDeploymentPage } from '@/hooks/admin/use-deployment-page';
import { cn } from '@/lib/utils';

export default function AdminDeploymentPage(): React.ReactElement {
  const controller = useDeploymentPage();
  if (!controller.isLoading && controller.user && controller.user.isSuperAdmin !== true) {
    return <AccessDenied t={controller.t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={controller.t('adminDeployment.title')}
          description={controller.t('adminDeployment.description')}
        />
        <Button
          type="button"
          variant="outline"
          onClick={controller.retry}
          disabled={controller.isRefreshing}
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', controller.isRefreshing && 'animate-spin')}
            aria-hidden="true"
          />
          {controller.t('adminDeployment.refresh')}
        </Button>
      </div>
      {controller.isLoading ? (
        <LoadingSpinner label={controller.t('adminDeployment.loading')} />
      ) : null}
      {controller.isError ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
          role="alert"
        >
          {controller.error?.message ?? controller.t('adminDeployment.error')}
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && controller.status ? (
        <>
          <DeploymentTroubleshootingCard
            t={controller.t}
            status={controller.status}
            progress={controller.progress}
          />
          <DeploymentControlPanel
            t={controller.t}
            status={controller.status}
            actions={controller.actions}
          />
          <DeploymentRunProgressCard
            t={controller.t}
            locale={controller.locale}
            progress={controller.progress}
          />
          <DeploymentStatusContent
            status={controller.status}
            t={controller.t}
            locale={controller.locale}
          />
          <DeploymentCredentialsCard
            t={controller.t}
            locale={controller.locale}
            status={controller.status}
            credentials={controller.credentials}
          />
        </>
      ) : null}
    </div>
  );
}
