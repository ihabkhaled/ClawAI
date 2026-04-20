'use client';

import { PairingApprovalCard } from '@/components/agent/connect/pairing-approval-card';
import { PairingEmptyState } from '@/components/agent/connect/pairing-empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { MutationStatus, PairingEmptyStateKind } from '@/enums';
import { useConnectDevicePage } from '@/hooks/agent/use-connect-device-page';
import { useTranslation } from '@/lib/i18n';

export default function ConnectDevicePage(): React.ReactElement {
  const { t } = useTranslation();
  const page = useConnectDevicePage();
  if (page.pairingCode === null) {
    return (
      <div className="flex h-full flex-col gap-6">
        <PageHeader
          title={t('agent.connect.title')}
          description={t('agent.connect.approveDescription')}
        />
        <PairingEmptyState t={t} kind={PairingEmptyStateKind.EXPIRED} />
      </div>
    );
  }
  if (page.approvedDeviceId !== null) {
    return (
      <div className="flex h-full flex-col gap-6">
        <PageHeader title={t('agent.connect.title')} />
        <PairingEmptyState t={t} kind={PairingEmptyStateKind.SUCCESS} />
      </div>
    );
  }
  if (page.denyStatus === MutationStatus.SUCCESS) {
    return (
      <div className="flex h-full flex-col gap-6">
        <PageHeader title={t('agent.connect.title')} />
        <PairingEmptyState t={t} kind={PairingEmptyStateKind.DENIED} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('agent.connect.title')}
        description={t('agent.connect.approveDescription')}
      />
      {page.approveStatus === MutationStatus.PENDING ? (
        <LoadingSpinner label={t('agent.connect.approveButton')} />
      ) : (
        <PairingApprovalCard
          t={t}
          deviceName={page.deviceName}
          setDeviceName={page.setDeviceName}
          selectedScopes={page.selectedScopes}
          setSelectedScopes={page.setSelectedScopes}
          approve={page.approve}
          deny={page.deny}
          isBusy={page.denyStatus === MutationStatus.PENDING}
        />
      )}
      {page.approveStatus === MutationStatus.ERROR ? (
        <p className="text-center text-sm text-destructive">
          {page.approveError instanceof Error ? page.approveError.message : t('agent.loadFailed')}
        </p>
      ) : null}
    </div>
  );
}
