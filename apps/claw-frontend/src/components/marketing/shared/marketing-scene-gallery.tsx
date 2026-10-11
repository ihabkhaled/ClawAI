import { MarketingFigure } from '@/components/marketing/shared/marketing-figure';
import {
  MARKETING_PAGE_SCENES,
  MARKETING_STEP_FIGURE_SIZES,
} from '@/constants/marketing-scenes.constants';
import { MarketingSceneGalleryLayout } from '@/enums/marketing-scene-gallery-layout.enum';
import type { MarketingSceneGalleryProps } from '@/types/marketing-scenes.types';
import { getMarketingScenesContent } from '@/utilities/marketing-scenes.utility';

/**
 * The "See it in the app" section: a grid of real screenshots, or a numbered strip of steps.
 * A plain server-renderable component: the caller passes the locale it already resolved. It sits below the page's own H1 and uses an H2, and it
 * never sets `priority` on an image, so it cannot compete with the page's LCP element.
 */
export function MarketingSceneGallery({
  locale,
  page,
  scenes: explicitScenes,
  layout = MarketingSceneGalleryLayout.GRID,
  id,
}: MarketingSceneGalleryProps): React.ReactElement | null {
  const scenes = explicitScenes ?? (page === undefined ? [] : MARKETING_PAGE_SCENES[page]);
  if (scenes.length === 0) {
    return null;
  }
  const { heading } = getMarketingScenesContent(locale);
  const isSteps = layout === MarketingSceneGalleryLayout.STEPS;

  return (
    <section id={id} aria-label={heading} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
      {isSteps ? (
        <ol className="mt-8 space-y-10">
          {scenes.map((sceneId, index) => (
            <li key={sceneId} className="flex gap-4">
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 sm:max-w-3xl">
                <MarketingFigure
                  sceneId={sceneId}
                  locale={locale}
                  sizes={MARKETING_STEP_FIGURE_SIZES}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {scenes.map((sceneId) => (
            <li key={sceneId} className="min-w-0">
              <MarketingFigure sceneId={sceneId} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
