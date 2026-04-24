'use client';

import { Mail } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { GmailMessageDialog } from '@/components/workspace/gmail/gmail-message-dialog';
import { GmailMessageList } from '@/components/workspace/gmail/gmail-message-list';
import { useGmailPage } from '@/hooks/workspace/use-gmail-page';
import { useTranslation } from '@/lib/i18n';

export default function GmailPage(): ReactElement {
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
  } = useGmailPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('gmail.page.title')} description={t('gmail.page.description')} />

      {connector === undefined ? (
        <EmptyState
          icon={Mail}
          title={t('gmail.page.no_connector_title')}
          description={t('gmail.page.no_connector_description')}
        />
      ) : (
        <GmailMessageList
          messages={messages}
          isLoading={isLoading}
          isError={isError}
          onSelectMessage={handleSelectMessage}
          t={t}
        />
      )}

      <GmailMessageDialog
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
