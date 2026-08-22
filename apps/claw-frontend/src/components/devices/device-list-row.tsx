import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { DeviceStatus } from '@/enums';
import type { DeviceListRowProps } from '@/types/device-component.types';

import { DeviceStatusBadge } from './device-status-badge';

export function DeviceListRow({
  t,
  device,
  onRevoke,
  isRevoking,
}: DeviceListRowProps): ReactElement {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0 space-y-1">
        <Link href={`/settings/devices/${device.id}`} className="font-medium hover:underline">
          {device.name}
        </Link>
        <div className="text-muted-foreground text-sm break-words">
          {device.hostname} · {device.os} · v{device.agentVersion}
        </div>
        <div className="text-muted-foreground text-xs break-words">
          {device.scopes.join(', ')} · last seen: {device.lastSeenAt ?? '—'}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DeviceStatusBadge status={device.status} />
        {device.status === DeviceStatus.ACTIVE ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRevoke(device.id)}
            disabled={isRevoking}
          >
            {t('settings.devices.revoke')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
