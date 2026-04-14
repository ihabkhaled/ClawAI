import { CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WORKSPACE_ACTION_TYPE_LABEL } from '@/constants/workspace-action.constants';
import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';
import type { WorkspaceActionRowProps } from '@/types/component.types';

import { WorkspaceActionStatusBadge } from './workspace-action-status-badge';

export function WorkspaceActionRow({
  action,
  onApprove,
  onReject,
  isApproving,
  t,
}: WorkspaceActionRowProps): React.ReactElement {
  const isPending = action.status === WorkspaceActionStatus.PENDING_APPROVAL;
  const typeLabel = WORKSPACE_ACTION_TYPE_LABEL[action.actionType] ?? action.actionType;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <WorkspaceActionStatusBadge status={action.status} t={t} />
          <span className="text-sm font-medium">{typeLabel}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('workspaceActions.connector')}: {action.connector.name}
        </p>
        {action.errorMessage !== null ? (
          <p className="mt-1 text-xs text-destructive">{action.errorMessage}</p>
        ) : null}
        {action.rejectionReason !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('workspaceActions.rejectionReason')}: {action.rejectionReason}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(action.requestedAt).toLocaleString()}
        </p>
      </div>

      {isPending ? (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onApprove(action.id)}
            disabled={isApproving}
          >
            <CheckCircle className="me-1 h-3.5 w-3.5" />
            {t('workspaceActions.approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(action)}>
            <XCircle className="me-1 h-3.5 w-3.5" />
            {t('workspaceActions.reject')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
