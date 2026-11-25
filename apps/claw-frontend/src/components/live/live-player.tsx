import { LiveCaptionsOverlay } from '@/components/live/live-captions-overlay';
import { LiveLinkOnlyPlayer } from '@/components/live/live-link-only-player';
import { LiveWatchLink } from '@/components/live/live-watch-link';
import { LIVE_EMBED_IFRAME_ALLOW } from '@/constants/live-embed.constants';
import { LIVE_PLAYER_FRAME_CLASSES } from '@/constants/live.constants';
import { LiveCaptionPlacement } from '@/enums/live.enum';
import type { LivePlayerProps } from '@/types/live.types';
import { cn } from '@/utilities';

/**
 * A platform stream plays in one generic iframe whose origin passed the allowlist (YouTube nocookie,
 * Twitch with `parent`, Kick, Facebook); a link-only platform shows a "Watch on" button instead.
 * HLS plays through the same-origin proxy in a <video>; hls.js is attached by the player hook.
 */
export function LivePlayer({
  embed,
  isLinkOnly,
  hlsSrc,
  player,
  caption,
  isPortrait,
  t,
}: LivePlayerProps): React.ReactElement {
  if (isLinkOnly) {
    return <LiveLinkOnlyPlayer embed={embed} t={t} />;
  }
  if (hlsSrc === null) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'ring-border relative overflow-hidden rounded-xl bg-black shadow-lg ring-1',
            isPortrait ? LIVE_PLAYER_FRAME_CLASSES.portrait : LIVE_PLAYER_FRAME_CLASSES.landscape,
          )}
          data-testid="live-player-frame"
        >
          {embed.playerUrl ? (
            <iframe
              src={embed.playerUrl}
              title={t('live.platform.playerTitle', { platform: embed.platformName ?? '' })}
              allow={LIVE_EMBED_IFRAME_ALLOW}
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <p role="alert" className="text-foreground bg-background p-4 text-sm">
              {t('live.modal.playerError')}
            </p>
          )}
          {/* Server-pull and capture sessions: the newest caption sits over the platform player too. */}
          <LiveCaptionsOverlay
            caption={caption}
            label={t('live.modal.captionsLabel')}
            placement={LiveCaptionPlacement.TOP}
          />
        </div>
        <LiveWatchLink embed={embed} t={t} />
      </div>
    );
  }
  return (
    <div className="ring-border relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg ring-1">
      <video
        ref={player.videoRef}
        controls
        playsInline
        aria-label={t('live.modal.videoLabel')}
        className="absolute inset-0 h-full w-full"
      >
        <track kind="captions" />
      </video>
      <LiveCaptionsOverlay
        caption={caption}
        label={t('live.modal.captionsLabel')}
        placement={LiveCaptionPlacement.BOTTOM}
      />
      {player.hasPlayerError ? (
        <p
          role="alert"
          className="bg-background text-foreground absolute inset-x-0 top-0 p-2 text-sm"
        >
          {t('live.modal.playerError')}
        </p>
      ) : null}
    </div>
  );
}
