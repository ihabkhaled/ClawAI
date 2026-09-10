'use client';

import { Loader2, WifiOff } from 'lucide-react';

import { SseConnectionHealth } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { StreamHealthNoticeProps } from '@/types';

/**
 * Says out loud that the event stream is in trouble.
 *
 * A dropped stream used to be indistinguishable from a slow answer: the client
 * reconnected silently, and if it could not, nothing on the page changed. The
 * user waited — and waiting is the one thing that could not help.
 *
 * Renders nothing while the connection is healthy, so it costs the conversation
 * no vertical space in the normal case. It sits between the transcript and the
 * composer rather than floating, because a message about the conversation
 * belongs in the conversation's column and must not cover it.
 */
export function StreamHealthNotice({ health }: StreamHealthNoticeProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (health === SseConnectionHealth.LIVE) {
    return null;
  }

  const isLost = health === SseConnectionHealth.LOST;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isLost
          ? 'border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-xs'
          : 'border-border bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-xs'
      }
    >
      {isLost ? (
        <WifiOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
      )}
      <span className="min-w-0">
        {isLost ? t('chat.stream.connectionLost') : t('chat.stream.reconnecting')}
      </span>
    </div>
  );
}
