import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { DeviceStatus } from '@/enums';
import type { DeviceStatusBadgeProps } from '@/types/device-component.types';

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps): ReactElement {
  if (status === DeviceStatus.ACTIVE) {
    return <Badge variant="default">ACTIVE</Badge>;
  }
  return <Badge variant="destructive">REVOKED</Badge>;
}
