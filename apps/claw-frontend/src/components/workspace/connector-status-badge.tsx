'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { WorkspaceConnectorStatus } from '@/enums';
import type { ConnectorStatusBadgeProps } from '@/types';

export function ConnectorStatusBadge({
  status,
}: ConnectorStatusBadgeProps): React.ReactElement {
  if (status === WorkspaceConnectorStatus.CONNECTED) {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="size-3" />
        {status}
      </Badge>
    );
  }
  if (
    status === WorkspaceConnectorStatus.DISCONNECTED ||
    status === WorkspaceConnectorStatus.DEGRADED
  ) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}
