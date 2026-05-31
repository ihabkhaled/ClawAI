'use client';

import { Loader2 } from 'lucide-react';

import type { VirtualizedMessagesHeaderProps } from '@/types';

// Pure-render header banner mounted as Virtuoso's `components.Header`.
// Shows a spinner while older messages are being fetched, otherwise (when no
// further pages exist) marks the beginning of the conversation. Lives in its
// own file so virtualized-messages.tsx stays hook-free.
export function VirtualizedMessagesHeader({
  isFetchingPreviousPage,
  hasPreviousPage,
  t,
}: VirtualizedMessagesHeaderProps): React.ReactElement | null {
  if (isFetchingPreviousPage) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ms-2 text-xs text-muted-foreground">
          {t('chat.loadingOlderMessages')}
        </span>
      </div>
    );
  }
  if (!hasPreviousPage) {
    return (
      <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
        {t('chat.beginningOfConversation')}
      </div>
    );
  }
  return null;
}
