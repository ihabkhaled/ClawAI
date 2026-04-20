import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatus } from '@/enums';
import type { DeviceDetailCardProps } from '@/types/device-component.types';

import { DeviceStatusBadge } from './device-status-badge';

export function DeviceDetailCard({
  t,
  device,
  onRevoke,
  isRevoking,
}: DeviceDetailCardProps): ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{device.name}</CardTitle>
        <DeviceStatusBadge status={device.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="font-medium">ID: </span>
          <span className="font-mono text-xs text-muted-foreground">{device.id}</span>
        </div>
        <div>
          <span className="font-medium">Host: </span>
          {device.hostname}
        </div>
        <div>
          <span className="font-medium">OS: </span>
          {device.os} ({device.platform})
        </div>
        <div>
          <span className="font-medium">Agent: </span>v{device.agentVersion}
        </div>
        <div>
          <span className="font-medium">{t('settings.devices.scopesHeading')}: </span>
          {device.scopes.join(', ')}
        </div>
        <div>
          <span className="font-medium">Last seen: </span>
          {device.lastSeenAt ?? '—'}
        </div>
        <div>
          <span className="font-medium">Sessions: </span>
          {device._count.sessions}
        </div>
        <div>
          <span className="font-medium">Refresh tokens: </span>
          {device._count.refreshTokens}
        </div>
        {device.status === DeviceStatus.REVOKED ? (
          <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {t('settings.devices.revokedBanner')}: {device.revokeReason ?? '—'}
          </div>
        ) : null}
      </CardContent>
      {device.status === DeviceStatus.ACTIVE ? (
        <CardFooter>
          <Button variant="destructive" onClick={onRevoke} disabled={isRevoking}>
            {t('settings.devices.revoke')}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
