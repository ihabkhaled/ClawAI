import { MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SlackMessageRowProps } from '@/types/component.types';

export function SlackMessageRow({
  message,
  metadata,
  onClick,
  t,
}: SlackMessageRowProps): React.ReactElement {
  const date =
    message.externalCreatedAt !== null
      ? new Date(message.externalCreatedAt).toLocaleDateString()
      : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent',
        metadata.isThreadReply && 'ml-4 border-l-2 border-l-primary/30',
      )}
    >
      <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {metadata.channelName.length > 0 ? `#${metadata.channelName}` : ''}
            {metadata.senderName.length > 0 ? ` · ${metadata.senderName}` : ''}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {message.content ?? message.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {metadata.isThreadReply && (
            <Badge variant="outline" className="text-xs">
              {t('slack.message.thread_reply')}
            </Badge>
          )}
          {metadata.reactions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('slack.message.reactions')}: {metadata.reactions.slice(0, 3).join(' ')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
