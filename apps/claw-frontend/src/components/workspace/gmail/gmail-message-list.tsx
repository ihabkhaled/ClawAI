import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { GmailMessageListProps } from '@/types/component.types';
import { extractGmailMetadata } from '@/utilities/gmail.utility';

import { GmailMessageRow } from './gmail-message-row';

export function GmailMessageList({
  messages,
  isLoading,
  isError,
  onSelectMessage,
  t,
}: GmailMessageListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('gmail.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('gmail.page.error_title')}</p>;
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={t('gmail.page.empty_title')}
        description={t('gmail.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((msg) => {
        const meta = extractGmailMetadata(msg.metadata);
        return (
          <GmailMessageRow
            key={msg.id}
            message={msg}
            metadata={meta}
            onClick={() => onSelectMessage(msg)}
            t={t}
          />
        );
      })}
    </div>
  );
}
