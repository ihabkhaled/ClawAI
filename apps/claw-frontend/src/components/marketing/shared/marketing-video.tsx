'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { useMarketingVideo } from '@/hooks/marketing/use-marketing-video';
import type { MarketingVideoProps } from '@/types/marketing-videos.types';

/**
 * One self-hosted clip that costs nothing until it is wanted.
 *
 * It renders a play button over a lazily loaded poster, inside a 16:9 box that is reserved from the
 * first paint, so the page requests no video bytes and nothing shifts. Pressing it (click, Enter or
 * Space) swaps in the player, which starts and takes focus. The player points at the visible
 * caption with `aria-describedby`.
 *
 * The clips carry an audio track. `muted` stays only so the `media-has-caption` lint rule is
 * satisfied; the controls can unmute. If the clips contain speech, the owner supplies `.vtt`
 * captions and they are added here as a `<track kind="captions">`.
 */
export function MarketingVideo({ video }: MarketingVideoProps): React.ReactElement {
  const { activated, activate, videoRef } = useMarketingVideo();
  const descriptionId = `${video.id}-description`;

  return (
    <figure data-video-id={video.id} className="w-full">
      <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-xl border shadow-sm">
        {activated ? (
          <video
            ref={videoRef}
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            poster={video.posterSrc}
            width={video.width}
            height={video.height}
            aria-label={video.title}
            aria-describedby={descriptionId}
            className="focus-visible:ring-ring size-full object-cover focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <source src={video.src} type="video/mp4" />
            {video.title}
          </video>
        ) : (
          <Button
            variant="ghost"
            onClick={activate}
            aria-label={video.title}
            aria-describedby={descriptionId}
            className="group focus-visible:ring-ring absolute inset-0 h-full w-full rounded-none p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-inset"
          >
            <Image
              src={video.posterSrc}
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              loading="lazy"
              className="object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/25"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-black/85 text-white">
                <Play className="size-7 fill-current" />
              </span>
            </span>
          </Button>
        )}
      </div>
      <figcaption id={descriptionId} className="mt-3 flex flex-col gap-1">
        <strong className="text-foreground font-semibold">{video.title}</strong>
        <span className="text-muted-foreground text-sm">{video.description}</span>
        <span className="text-muted-foreground text-xs">{video.durationLabel}</span>
      </figcaption>
    </figure>
  );
}
