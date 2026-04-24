'use client';

import { MessageSquare } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SlackMessageDialog } from '@/components/workspace/slack/slack-message-dialog';
import { SlackMessageList } from '@/components/workspace/slack/slack-message-list';
import { useSlackPage } from '@/hooks/workspace/use-slack-page';
import { useTranslation } from '@/lib/i18n';

export default function SlackPage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    messages,
    isLoading,
    isError,
    selectedMessage,
    aiDialogKind,
    handleSelectMessage,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useSlackPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('slack.page.title')} description={t('slack.page.description')} />

      {connector === undefined ? (
        <EmptyState
          icon={MessageSquare}
          title={t('slack.page.no_connector_title')}
          description={t('slack.page.no_connector_description')}
        />
      ) : (
        <SlackMessageList
          messages={messages}
          isLoading={isLoading}
          isError={isError}
          onSelectMessage={handleSelectMessage}
          t={t}
        />
      )}

      <SlackMessageDialog
        message={selectedMessage}
        open={selectedMessage !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedMessage !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedMessage.title}
          initialContext={selectedMessage.content ?? selectedMessage.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
