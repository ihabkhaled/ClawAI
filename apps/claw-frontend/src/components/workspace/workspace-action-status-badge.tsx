import { Badge } from '@/components/ui/badge';
import {
  WORKSPACE_ACTION_STATUS_I18N_KEY,
  WORKSPACE_ACTION_STATUS_VARIANT,
} from '@/constants/workspace-action.constants';
import type { WorkspaceActionStatusBadgeProps } from '@/types/component.types';

export function WorkspaceActionStatusBadge({
  status,
  t,
}: WorkspaceActionStatusBadgeProps): React.ReactElement {
  const variant = WORKSPACE_ACTION_STATUS_VARIANT[status] ?? 'outline';
  const label = t(WORKSPACE_ACTION_STATUS_I18N_KEY[status] ?? 'workspaceActions.pendingApproval');

  return <Badge variant={variant}>{label}</Badge>;
}
