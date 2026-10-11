import Image from 'next/image';

import {
  MARKETING_FIGURE_SIZES,
  MARKETING_MOBILE_FIGURE_SIZES,
  MARKETING_MOBILE_SCENES,
} from '@/constants/marketing-scenes.constants';
import type { MarketingFigureProps } from '@/types/marketing-scenes.types';
import { getMarketingScene, getMarketingSceneCopy } from '@/utilities/marketing-scenes.utility';

/**
 * One real product screenshot with its localized alt text and caption.
 *
 * The width and height come from the registry, so the box is reserved before the file loads (no
 * layout shift). It loads lazily unless the caller marks it `priority`, which only the single
 * above-the-fold image of a page may do. Logical spacing only, so it reads the same in RTL, and
 * theme tokens only, so it follows light and dark. An unknown scene renders nothing.
 */
export function MarketingFigure({
  sceneId,
  locale,
  priority = false,
  sizes,
}: MarketingFigureProps): React.ReactElement | null {
  const asset = getMarketingScene(sceneId);
  const copy = getMarketingSceneCopy(locale, sceneId);
  if (asset === undefined || copy === undefined) {
    return null;
  }

  const isMobileScene = MARKETING_MOBILE_SCENES.has(sceneId);
  const resolvedSizes =
    sizes ?? (isMobileScene ? MARKETING_MOBILE_FIGURE_SIZES : MARKETING_FIGURE_SIZES);

  return (
    <figure
      data-scene={sceneId}
      className={isMobileScene ? 'mx-auto w-full max-w-[16rem]' : 'w-full'}
    >
      <Image
        src={asset.src}
        width={asset.width}
        height={asset.height}
        alt={copy.alt}
        sizes={resolvedSizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="border-border bg-muted h-auto w-full rounded-lg border shadow-sm"
      />
      <figcaption className="text-muted-foreground mt-2 text-sm">{copy.caption}</figcaption>
    </figure>
  );
}
