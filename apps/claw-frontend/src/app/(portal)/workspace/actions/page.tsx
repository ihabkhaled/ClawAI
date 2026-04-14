'use client';

import { CheckSquare } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceActionList } from '@/components/workspace/workspace-action-list';
import { useWorkspaceActionsPage } from '@/hooks/workspace/use-workspace-actions-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceActionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    actions,
    isLoading,
    isError,
    handleApprove,
    isApproving,
    rejectTarget,
    setRejectTarget,
    rejectReason,
    setRejectReason,
    handleRejectSubmit,
    isRejecting,
  } = useWorkspaceActionsPage();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('workspaceActions.title')}
        description={t('workspaceActions.description')}
      />

      {!isLoading && !isError && actions.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('workspaceActions.noActions')}
          description={t('workspaceActions.noActionsDesc')}
        />
      ) : (
        <WorkspaceActionList
          actions={actions}
          isLoading={isLoading}
          isError={isError}
          onApprove={handleApprove}
          onReject={setRejectTarget}
          isApproving={isApproving}
          t={t}
        />
      )}

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspaceActions.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('workspaceActions.rejectDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('workspaceActions.rejectReasonPlaceholder')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isRejecting}>
              {t('workspaceActions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={isRejecting}>
              {t('workspaceActions.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
