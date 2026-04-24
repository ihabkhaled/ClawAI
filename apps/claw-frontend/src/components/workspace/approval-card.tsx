import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ActionGenerationMode } from '@/enums/action-generation-mode.enum';
import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';
import type { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';
import type { ApprovalCardProps } from '@/types/approval-center.types';
import { isConnectorStale, stringifyPayload } from '@/utilities/approval-card.utility';

export function ApprovalCard({
  action,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit,
  isActing,
  t,
}: ApprovalCardProps): ReactElement {
  const stale = isConnectorStale(action.connector.status as WorkspaceConnectorStatus);
  const isEdited = action.status === WorkspaceActionStatus.EDITED;
  const version = action.draftHistory.length + 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(action.id)}
          aria-label={t('workspaceSync.band.fresh')}
          disabled={isActing}
        />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{action.actionType}</span>
            <span className="text-xs text-muted-foreground">
              {action.connector.provider} · {action.connector.name}
            </span>
            {isEdited ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
                {t('approvals.card.edited', { version: String(version) })}
              </span>
            ) : null}
            {stale ? (
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                {t('approvals.card.source_stale')}
              </span>
            ) : null}
            {action.generatedBy !== null ? (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                {action.generatedBy.mode === ActionGenerationMode.AUTO
                  ? t('approvals.card.attribution_auto', {
                      model: action.generatedBy.displayName,
                    })
                  : t('approvals.card.attribution_manual', {
                      model: action.generatedBy.displayName,
                    })}
              </span>
            ) : null}
          </div>
          <pre className="max-h-40 overflow-auto rounded-md bg-muted/30 p-3 text-xs">
            {stringifyPayload(action.payload)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onApprove(action.id)}
              disabled={isActing || stale}
            >
              {t('approvals.card.approve')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(action.id)}
              disabled={isActing}
            >
              {t('approvals.card.edit')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onReject(action.id)}
              disabled={isActing}
            >
              {t('approvals.card.reject')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
