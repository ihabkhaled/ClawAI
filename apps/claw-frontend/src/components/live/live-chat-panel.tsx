import { LiveChatLink } from '@/components/live/live-chat-link';
import type { LiveChatPanelProps } from '@/types/live.types';

/**
 * The platform's own live chat in an allowlisted iframe. A browser reports no error to the page when
 * a cross-origin frame is refused (and React wires no `error` event on iframes), so the
 * "Open chat on" link always sits under the frame as the fallback.
 */
export function LiveChatPanel({ embed, t }: LiveChatPanelProps): React.ReactElement {
  return (
    <div className="flex min-h-80 flex-1 flex-col gap-2" data-testid="live-chat-panel">
      {embed.chatUrl === null ? (
        <p role="alert" className="text-muted-foreground text-sm">
          {t('live.platform.chatError')}
        </p>
      ) : (
        <iframe
          src={embed.chatUrl}
          title={t('live.platform.chatTitle', { platform: embed.platformName ?? '' })}
          referrerPolicy="strict-origin-when-cross-origin"
          className="border-border min-h-80 w-full flex-1 rounded-md border"
        />
      )}
      <LiveChatLink embed={embed} t={t} />
    </div>
  );
}
