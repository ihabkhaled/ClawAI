'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { ApprovalBulkBar } from '@/components/workspace/approval-bulk-bar';
import { ApprovalEditDialog } from '@/components/workspace/approval-edit-dialog';
import { ApprovalRejectDialog } from '@/components/workspace/approval-reject-dialog';
import { ApprovalsContent } from '@/components/workspace/approvals-content';
import { useApprovalsPage } from '@/hooks/workspace/use-approvals-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceApprovalsPage(): ReactElement {
  const { t } = useTranslation();
  const {
    actions,
    isLoading,
    isError,
    error,
    selectedIds,
    toggleSelect,
    clearSelection,
    editTarget,
    setEditTarget,
    rejectTargetId,
    setRejectTargetId,
    handleApprove,
    handleReject,
    handleEdit,
    handleBulkApprove,
    isActing,
  } = useApprovalsPage();

  const rejectTarget = actions.find((action) => action.id === rejectTargetId) ?? null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('approvals.page.title')} description={t('approvals.page.description')} />

      <ApprovalBulkBar
        selectedCount={selectedIds.size}
        onApproveAll={handleBulkApprove}
        onClearSelection={clearSelection}
        isPending={isActing}
        t={t}
      />

      <ApprovalsContent
        isLoading={isLoading}
        isError={isError}
        error={error}
        actions={actions}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        handleApprove={handleApprove}
        setRejectTargetId={setRejectTargetId}
        setEditTarget={setEditTarget}
        isActing={isActing}
        t={t}
      />

      <ApprovalEditDialog
        action={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
        isPending={isActing}
        t={t}
      />

      <ApprovalRejectDialog
        actionId={rejectTargetId}
        open={rejectTarget !== null}
        onClose={() => setRejectTargetId(null)}
        onSubmit={handleReject}
        isPending={isActing}
        t={t}
      />
    </div>
  );
}
