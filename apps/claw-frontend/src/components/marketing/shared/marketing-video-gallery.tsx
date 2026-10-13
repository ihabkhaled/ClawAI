import { MarketingVideoItem } from '@/components/marketing/shared/marketing-video-item';
import { MarketingVideoLayout } from '@/enums/marketing-video-layout.enum';
import type { MarketingVideoGalleryProps } from '@/types/marketing-videos.types';

/**
 * Lays resolved videos out: one centred explainer, a three-part strip, or a wrapping row of 9:16
 * Shorts. Logical properties only, so it reads the same in right-to-left languages.
 */
export function MarketingVideoGallery({
  layout,
  items,
}: MarketingVideoGalleryProps): React.ReactElement {
  if (layout === MarketingVideoLayout.STEPS) {
    return (
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <MarketingVideoItem item={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (layout === MarketingVideoLayout.SHORTS) {
    return (
      <ul className="flex flex-wrap justify-center gap-6">
        {items.map((item) => (
          <li key={item.id} className="w-full max-w-60">
            <MarketingVideoItem item={item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {items.map((item) => (
        <div key={item.id}>
          <MarketingVideoItem item={item} />
        </div>
      ))}
    </div>
  );
}
