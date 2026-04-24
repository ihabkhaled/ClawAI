import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { ApprovalBulkBarProps } from '@/types/approval-center.types';

export function ApprovalBulkBar({
  selectedCount,
  onApproveAll,
  onClearSelection,
  isPending,
  t,
}: ApprovalBulkBarProps): ReactElement | null {
  if (selectedCount === 0) {
    return null;
  }
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-border bg-card px-4 py-2 shadow-sm">
      <span className="text-sm">
        {t('approvals.bulk.selected', { count: String(selectedCount) })}
      </span>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onApproveAll} disabled={isPending}>
          {t('approvals.bulk.approve_all')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onClearSelection}
          disabled={isPending}
        >
          {t('approvals.bulk.clear')}
        </Button>
      </div>
    </div>
  );
}
