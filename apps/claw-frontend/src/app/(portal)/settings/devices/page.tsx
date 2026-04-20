'use client';

import { Laptop } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { DeviceListRow } from '@/components/devices/device-list-row';
import { useDevicesPage } from '@/hooks/agent/use-devices-page';
import { useTranslation } from '@/lib/i18n';

export default function SettingsDevicesPage(): React.ReactElement {
  const { t } = useTranslation();
  const page = useDevicesPage();
  if (page.isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('settings.devices.title')}
          description={t('settings.devices.description')}
        />
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
      <PageHeader
        title={t('settings.devices.title')}
        description={t('settings.devices.description')}
      />
      {page.isLoading ? <LoadingSpinner label={t('agent.loading')} /> : null}
      {!page.isLoading && page.devices.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title={t('settings.devices.emptyTitle')}
          description={t('settings.devices.emptyBody')}
        />
      ) : null}
      {!page.isLoading && page.devices.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {page.devices.map((device) => (
            <DeviceListRow
              key={device.id}
              t={t}
              device={device}
              onRevoke={page.revoke}
              isRevoking={page.revokingId === device.id}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
