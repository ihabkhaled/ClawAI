import Image from 'next/image';

import type { LiveIntelligenceScreenshotStripProps } from '@/types/live-intelligence-marketing.types';

/** Three phone screenshots: one column on a phone, three from `md`. Alt text is the translated title. */
export function LiveIntelligenceScreenshotStrip({
  screenshots,
}: LiveIntelligenceScreenshotStripProps): React.ReactElement {
  return (
    <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {screenshots.map((shot) => (
        <li key={shot.src}>
          <figure className="mx-auto w-full max-w-60">
            <Image
              src={shot.src}
              width={shot.width}
              height={shot.height}
              alt={shot.caption.title}
              loading="lazy"
              sizes="(min-width: 768px) 240px, 60vw"
              className="border-border h-auto w-full rounded-2xl border shadow-sm"
            />
            <figcaption className="mt-3 flex flex-col gap-1">
              <strong className="text-foreground font-semibold">{shot.caption.title}</strong>
              <span className="text-muted-foreground text-sm">{shot.caption.body}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
