'use client';

import { GitPullRequest } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { PullRequestDialog } from '@/components/workspace/source-control/pull-request-dialog';
import { PullRequestList } from '@/components/workspace/source-control/pull-request-list';
import { useSourceControlPage } from '@/hooks/workspace/use-source-control-page';
import { useTranslation } from '@/lib/i18n';

export default function SourceControlPage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    pullRequests,
    isLoading,
    isError,
    selectedPr,
    aiDialogKind,
    handleSelectPr,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useSourceControlPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('source_control.page.title')}
        description={t('source_control.page.description')}
      />

      {connector === undefined ? (
        <EmptyState
          icon={GitPullRequest}
          title={t('source_control.page.no_connector_title')}
          description={t('source_control.page.no_connector_description')}
        />
      ) : (
        <PullRequestList
          pullRequests={pullRequests}
          isLoading={isLoading}
          isError={isError}
          onSelectPr={handleSelectPr}
          t={t}
        />
      )}

      <PullRequestDialog
        pr={selectedPr}
        open={selectedPr !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedPr !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedPr.title}
          initialContext={selectedPr.content ?? selectedPr.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
