import { Skeleton } from '@/components/ui/skeleton';
import type { WorkspaceActionListProps } from '@/types/component.types';

import { WorkspaceActionRow } from './workspace-action-row';

export function WorkspaceActionList({
  actions,
  isLoading,
  isError,
  onApprove,
  onReject,
  isApproving,
  t,
}: WorkspaceActionListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-destructive">
        {t('workspaceActions.loadFailed')}
      </p>
    );
  }

  if (actions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('workspaceActions.noActions')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {actions.map((action) => (
        <WorkspaceActionRow
          key={action.id}
          action={action}
          onApprove={onApprove}
          onReject={onReject}
          isApproving={isApproving}
          t={t}
        />
      ))}
    </div>
  );
}
