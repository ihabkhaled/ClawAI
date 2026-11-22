import { MessageSquare } from 'lucide-react';

import type { LiveChatLinkProps } from '@/types/live.types';

/** "Open chat on <Platform>": the platform page in a new tab, when no chat can be embedded here. */
export function LiveChatLink({ embed, t }: LiveChatLinkProps): React.ReactElement | null {
  if (embed.watchUrl === null || embed.platformName === null) {
    return null;
  }
  return (
    <a
      href={embed.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
      data-testid="live-chat-link"
    >
      <MessageSquare className="h-4 w-4" aria-hidden="true" />
      {t('live.platform.openChat', { platform: embed.platformName })}
    </a>
  );
}
