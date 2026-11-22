import { LiveCaptionsOverlay } from '@/components/live/live-captions-overlay';
import { YOUTUBE_IFRAME_ALLOW } from '@/constants/marketing-videos.constants';
import type { LivePlayerProps } from '@/types/live.types';
import { safeYoutubeEmbedUrl, youtubeWatchUrl } from '@/utilities/live-request.utility';

/**
 * YouTube plays in the youtube-nocookie iframe (player only, no AI). HLS plays through the
 * same-origin proxy in a <video>; hls.js is attached by the player hook, loaded on demand.
 */
export function LivePlayer({
  session,
  hlsSrc,
  player,
  caption,
  t,
}: LivePlayerProps): React.ReactElement {
  const embedUrl = safeYoutubeEmbedUrl(session.embedUrl);
  const watchUrl = youtubeWatchUrl(session.embedUrl);
  if (hlsSrc === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={t('live.modal.youtubePlayerTitle')}
              allow={YOUTUBE_IFRAME_ALLOW}
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
        {watchUrl ? (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary self-end text-sm underline-offset-4 hover:underline"
          >
            {t('live.modal.watchOnYoutube')}
          </a>
        ) : null}
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
