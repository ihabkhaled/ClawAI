import { MessageSquare } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { SlackMessageListProps } from '@/types/component.types';
import { extractSlackMetadata } from '@/utilities/slack.utility';

import { SlackMessageRow } from './slack-message-row';

export function SlackMessageList({
  messages,
  isLoading,
  isError,
  onSelectMessage,
  t,
}: SlackMessageListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('slack.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('slack.page.error_title')}</p>;
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={t('slack.page.empty_title')}
        description={t('slack.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((msg) => {
        const meta = extractSlackMetadata(msg.metadata);
        return (
          <SlackMessageRow
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
