import { Mail } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className={cn(
        'border-border hover:bg-accent flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        metadata.isUnread && 'border-primary/30 bg-primary/5',
      )}
    >
      <Mail
        className={cn(
          'text-muted-foreground mt-0.5 size-4 shrink-0',
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
          <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
        </div>
        <p className="text-muted-foreground truncate text-sm">
          {metadata.subject || message.title}
        </p>
        {metadata.snippet.length > 0 && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{metadata.snippet}</p>
        )}
      </div>
      {metadata.isUnread && (
        <Badge variant="default" className="shrink-0 text-xs">
          {t('gmail.message.unread')}
        </Badge>
      )}
    </Button>
  );
}
