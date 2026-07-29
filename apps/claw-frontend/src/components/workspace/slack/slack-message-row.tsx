import { MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className={cn(
        'border-border hover:bg-accent flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        metadata.isThreadReply && 'border-l-primary/30 ml-4 border-l-2',
      )}
    >
      <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {metadata.channelName.length > 0 ? `#${metadata.channelName}` : ''}
            {metadata.senderName.length > 0 ? ` · ${metadata.senderName}` : ''}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
          {message.content ?? message.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {metadata.isThreadReply && (
            <Badge variant="outline" className="text-xs">
              {t('slack.message.thread_reply')}
            </Badge>
          )}
          {metadata.reactions.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {t('slack.message.reactions')}: {metadata.reactions.slice(0, 3).join(' ')}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
}
