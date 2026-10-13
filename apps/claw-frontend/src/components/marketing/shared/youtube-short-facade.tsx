'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { YOUTUBE_IFRAME_ALLOW } from '@/constants/marketing-videos.constants';
import { useYouTubeFacade } from '@/hooks/marketing/use-youtube-facade';
import type { YouTubeShortFacadeProps } from '@/types/marketing-videos.types';

/**
 * A YouTube Short that costs nothing until it is wanted.
 *
 * It renders a button over our own copy of the thumbnail, so the page makes no request to YouTube
 * and sets no YouTube cookie. Pressing it (click, Enter or Space) swaps the button for the
 * privacy-enhanced embed, which starts playing. The box is 9:16 from the first paint, so the swap
 * moves nothing.
 */
export function YouTubeShortFacade({ short }: YouTubeShortFacadeProps): React.ReactElement {
  const { activated, activate, iframeRef } = useYouTubeFacade();

  return (
    <figure data-video-id={short.id} className="w-full">
      <div className="border-border relative aspect-[9/16] w-full overflow-hidden rounded-xl border bg-black shadow-sm">
        {activated ? (
          <iframe
            ref={iframeRef}
            src={short.embedUrl}
            title={short.frameTitle}
            allow={YOUTUBE_IFRAME_ALLOW}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <Button
            variant="ghost"
            onClick={activate}
            aria-label={short.playLabel}
            className="group focus-visible:ring-ring absolute inset-0 h-full w-full rounded-none p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-inset"
          >
            <Image
              src={short.thumbnailSrc}
              alt=""
              fill
              sizes="(min-width: 640px) 240px, 70vw"
              loading="lazy"
              className="object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/25"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-black/85 text-white">
                <Play className="size-6 fill-current" />
              </span>
            </span>
          </Button>
        )}
      </div>
      <figcaption className="mt-3 flex flex-col items-start gap-1.5">
        <span className="text-foreground text-sm font-medium">{short.title}</span>
      </figcaption>
    </figure>
  );
}
