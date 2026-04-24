import { Mail } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GmailMessageRowProps } from '@/types/component.types';

export function GmailMessageRow({
  message,
  metadata,
  onClick,
  t,
}: GmailMessageRowProps): React.ReactElement {
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
        metadata.isUnread && 'border-primary/30 bg-primary/5',
      )}
    >
      <Mail
        className={cn(
          'mt-0.5 size-4 shrink-0 text-muted-foreground',
          metadata.isUnread && 'text-primary',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn('truncate text-sm', metadata.isUnread ? 'font-semibold' : 'font-medium')}
          >
            {metadata.from}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {metadata.subject || message.title}
        </p>
        {metadata.snippet.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{metadata.snippet}</p>
        )}
      </div>
      {metadata.isUnread && (
        <Badge variant="default" className="shrink-0 text-xs">
          {t('gmail.message.unread')}
        </Badge>
      )}
    </button>
  );
}
