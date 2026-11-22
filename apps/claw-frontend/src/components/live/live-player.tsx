import { LiveCaptionsOverlay } from '@/components/live/live-captions-overlay';
import { LiveLinkOnlyPlayer } from '@/components/live/live-link-only-player';
import { LiveWatchLink } from '@/components/live/live-watch-link';
import { LIVE_EMBED_IFRAME_ALLOW } from '@/constants/live-embed.constants';
import type { LivePlayerProps } from '@/types/live.types';

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
  t,
}: LivePlayerProps): React.ReactElement {
  if (isLinkOnly) {
    return <LiveLinkOnlyPlayer embed={embed} t={t} />;
  }
  if (hlsSrc === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
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
        </div>
        <LiveWatchLink embed={embed} t={t} />
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video
        ref={player.videoRef}
        controls
        playsInline
        aria-label={t('live.modal.videoLabel')}
        className="absolute inset-0 h-full w-full"
      >
        <track kind="captions" />
      </video>
      <LiveCaptionsOverlay caption={caption} label={t('live.modal.captionsLabel')} />
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
