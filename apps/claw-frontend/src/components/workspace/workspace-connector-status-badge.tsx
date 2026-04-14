import { Badge } from '@/components/ui/badge';
import {
  WORKSPACE_CONNECTOR_STATUS_I18N_KEY,
  WORKSPACE_CONNECTOR_STATUS_VARIANT,
} from '@/constants/workspace-connector.constants';
import type { WorkspaceConnectorStatusBadgeProps } from '@/types/component.types';

export function WorkspaceConnectorStatusBadge({
  connector,
  t,
}: WorkspaceConnectorStatusBadgeProps): React.ReactElement {
  const variant = WORKSPACE_CONNECTOR_STATUS_VARIANT[connector.status] ?? 'outline';
  const label = t(
    WORKSPACE_CONNECTOR_STATUS_I18N_KEY[connector.status] ?? 'workspaceConnectors.unknown',
  );

  return <Badge variant={variant}>{label}</Badge>;
}
