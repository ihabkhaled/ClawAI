'use client';

import { TicketCheck } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { JiraTicketDialog } from '@/components/workspace/jira/jira-ticket-dialog';
import { JiraTicketList } from '@/components/workspace/jira/jira-ticket-list';
import { useJiraPage } from '@/hooks/workspace/use-jira-page';
import { useTranslation } from '@/lib/i18n';

export default function JiraPage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    tickets,
    isLoading,
    isError,
    selectedTicket,
    aiDialogKind,
    handleSelectTicket,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useJiraPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('jira.page.title')} description={t('jira.page.description')} />

      {connector === undefined ? (
        <EmptyState
          icon={TicketCheck}
          title={t('jira.page.no_connector_title')}
          description={t('jira.page.no_connector_description')}
        />
      ) : (
        <JiraTicketList
          tickets={tickets}
          isLoading={isLoading}
          isError={isError}
          onSelectTicket={handleSelectTicket}
          t={t}
        />
      )}

      <JiraTicketDialog
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedTicket !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedTicket.title}
          initialContext={selectedTicket.content ?? selectedTicket.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
