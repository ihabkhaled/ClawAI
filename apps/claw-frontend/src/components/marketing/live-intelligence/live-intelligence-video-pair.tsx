import type { LiveIntelligenceVideoPairProps } from '@/types/live-intelligence-marketing.types';

/**
 * The two portrait clips: side by side from `sm`, stacked on a phone. `preload="none"` means the
 * page fetches no video bytes until the visitor presses play; the poster and the 9:16 box are
 * reserved from the first paint, so nothing shifts. `muted` keeps the `media-has-caption` rule
 * satisfied (the controls can unmute); the visible caption describes what each clip shows.
 */
export function LiveIntelligenceVideoPair({
  videos,
}: LiveIntelligenceVideoPairProps): React.ReactElement {
  return (
    <ul className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
      {videos.map((video) => (
        <li key={video.id}>
          <figure data-video-id={video.id} className="mx-auto w-full max-w-xs">
            <div className="border-border bg-muted aspect-[9/16] w-full overflow-hidden rounded-xl border shadow-sm">
              <video
                controls
                muted
                loop
                playsInline
                preload="none"
                poster={video.posterSrc}
                width={video.width}
                height={video.height}
                aria-label={video.caption.title}
                aria-describedby={`${video.id}-description`}
                className="size-full object-cover"
              >
                <source src={video.src} type="video/mp4" />
                {video.caption.title}
              </video>
            </div>
            <figcaption id={`${video.id}-description`} className="mt-3 flex flex-col gap-1">
              <strong className="text-foreground font-semibold">{video.caption.title}</strong>
              <span className="text-muted-foreground text-sm">{video.caption.body}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
