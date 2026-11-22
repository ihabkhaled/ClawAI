import { LiveChatLink } from '@/components/live/live-chat-link';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import type { LiveNoAiPanelProps } from '@/types/live.types';

/**
 * The side panel of a source with no AI: a link-only platform explains it has no embeddable player;
 * a player-only source says it gets no captions or summaries. The platform chat stays reachable.
 */
export function LiveNoAiPanel({ embed, isLinkOnly, t }: LiveNoAiPanelProps): React.ReactElement {
  const platform = embed.platformName ?? '';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className="border-border flex flex-col gap-2 rounded-md border p-4"
        data-testid={isLinkOnly ? 'live-link-only-panel' : 'live-player-only-panel'}
      >
        <p className="text-foreground text-sm font-medium">
          {isLinkOnly
            ? t('live.platform.linkOnlyTitle', { platform })
            : t('live.platform.playerOnlyTitle')}
        </p>
        <p className="text-muted-foreground text-sm">
          {isLinkOnly
            ? t('live.platform.linkOnlyPanel', { platform })
            : t('live.platform.playerOnly')}
        </p>
      </div>
      {embed.chatUrl === null ? (
        <LiveChatLink embed={embed} t={t} />
      ) : (
        <LiveChatPanel embed={embed} t={t} />
      )}
    </div>
  );
}
