import { AlertTriangle, CheckSquare } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ApprovalCard } from '@/components/workspace/approval-card';
import type { ApprovalsContentProps } from '@/types/approval-center.types';

export function ApprovalsContent({
  isLoading,
  isError,
  error,
  actions,
  selectedIds,
  toggleSelect,
  handleApprove,
  setRejectTargetId,
  setEditTarget,
  isActing,
  t,
}: ApprovalsContentProps): ReactElement {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('approvals.page.error_title')}
        description={error?.message ?? t('approvals.page.error_description')}
      />
    );
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={t('approvals.page.empty_title')}
        description={t('approvals.page.empty_description')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {actions.map((action) => (
        <ApprovalCard
          key={action.id}
          action={action}
          selected={selectedIds.has(action.id)}
          onToggleSelect={toggleSelect}
          onApprove={handleApprove}
          onReject={(id) => setRejectTargetId(id)}
          onEdit={(id) => {
            const found = actions.find((a) => a.id === id);
            if (found !== undefined) {
              setEditTarget(found);
            }
          }}
          isActing={isActing}
          t={t}
        />
      ))}
    </div>
  );
}
