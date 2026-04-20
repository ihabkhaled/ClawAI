'use client';

import { useParams } from 'next/navigation';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { DeviceDetailCard } from '@/components/devices/device-detail-card';
import { MutationStatus } from '@/enums';
import { useDeviceDetailPage } from '@/hooks/agent/use-device-detail-page';
import { useTranslation } from '@/lib/i18n';

export default function DeviceDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const params = useParams<{ deviceId: string }>();
  const deviceId = params?.deviceId;
  const page = useDeviceDetailPage(deviceId);
  if (page.isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('settings.devices.title')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {page.error instanceof Error ? page.error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('settings.devices.title')} />
      {page.isLoading ? <LoadingSpinner label={t('agent.loading')} /> : null}
      {!page.isLoading && page.device !== null ? (
        <DeviceDetailCard
          t={t}
          device={page.device}
          onRevoke={page.revoke}
          isRevoking={page.revokeStatus === MutationStatus.PENDING}
        />
      ) : null}
    </div>
  );
}
