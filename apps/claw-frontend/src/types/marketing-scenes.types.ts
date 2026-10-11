import type { Locale } from '@/enums/locale.enum';
import type { MarketingSceneGalleryLayout } from '@/enums/marketing-scene-gallery-layout.enum';
import type { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenePage } from '@/enums/marketing-scene-page.enum';

/** Where a screenshot lives and how big it really is, so the browser can reserve its space. */
export type MarketingSceneAsset = {
  src: string;
  width: number;
  height: number;
};

/** What one screenshot shows (`alt`) and the one-line caption under it, in one language. */
export type MarketingSceneCopy = {
  alt: string;
  caption: string;
};

/** Everything the screenshot components say in one language. */
export type MarketingScenesLocaleContent = {
  /** The heading of the "See it in the app" gallery. */
  heading: string;
  scenes: Record<MarketingSceneId, MarketingSceneCopy>;
};

export type MarketingFigureProps = {
  sceneId: MarketingSceneId;
  locale: Locale;
  /** Only the single above-the-fold image of a page may set this. */
  priority?: boolean;
  /** Overrides the registry-based `sizes` hint. */
  sizes?: string;
};

export type MarketingSceneGalleryProps = {
  locale: Locale;
  /** A fixed page whose scenes come from `MARKETING_PAGE_SCENES`. */
  page?: MarketingScenePage;
  /** Explicit scenes (used by the per-capability and per-task pages); wins over `page`. */
  scenes?: ReadonlyArray<MarketingSceneId>;
  /** `steps` draws a numbered list, `grid` draws a plain gallery. */
  layout?: MarketingSceneGalleryLayout;
  /** Section id for in-page links. */
  id?: string;
};

/** The gallery without a locale, for pages that do not already know the request locale. */
export type MarketingRequestSceneGalleryProps = Omit<MarketingSceneGalleryProps, 'locale'>;
