import { headers } from 'next/headers';

import { MarketingVideoGallery } from '@/components/marketing/shared/marketing-video-gallery';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  MARKETING_VIDEO_PLACEMENTS,
  MARKETING_VIDEO_UPLOAD_DATE,
} from '@/constants/marketing-videos.constants';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { createServerTranslator } from '@/lib/i18n/server-locale';
import { getSiteUrl } from '@/lib/site/site-config';
import type {
  MarketingVideoSectionProps,
  VideoObjectJsonLdInput,
} from '@/types/marketing-videos.types';
import { isSupportedLocale } from '@/utilities/locale.utility';
import {
  buildMarketingVideoView,
  getMarketingVideosForPlacement,
  isLocalVideo,
  toAbsoluteSiteUrl,
} from '@/utilities/marketing-videos.utility';
import { buildVideoObjectsJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

/**
 * The videos for one spot on the public site, with their heading and structured data.
 *
 * It resolves the request locale itself (like `MarketingRequestSceneGallery`), so a page adds a
 * video by naming a placement. The registry decides what shows. Only the self-hosted clips get
 * `VideoObject` markup. Renders nothing for a placement with no videos.
 */
export async function MarketingVideoSection({
  placement,
  contained = true,
}: MarketingVideoSectionProps): Promise<React.ReactElement | null> {
  const requestedLocale = (await headers()).get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const entries = getMarketingVideosForPlacement(placement, locale);
  if (entries.length === 0) {
    return null;
  }

  const t = createServerTranslator(locale);
  const config = MARKETING_VIDEO_PLACEMENTS[placement];
  const items = entries.map((entry) => buildMarketingVideoView(entry, t));
  const siteUrl = getSiteUrl();

  const videoObjects: VideoObjectJsonLdInput[] = [];
  for (const [index, entry] of entries.entries()) {
    const item = items[index];
    if (isLocalVideo(entry) && item?.kind === MarketingVideoKind.LOCAL) {
      videoObjects.push({
        name: item.title,
        description: item.description,
        thumbnailUrl: toAbsoluteSiteUrl(entry.posterSrc, siteUrl),
        contentUrl: toAbsoluteSiteUrl(entry.src, siteUrl),
        uploadDate: MARKETING_VIDEO_UPLOAD_DATE,
        durationSeconds: entry.durationSeconds,
      });
    }
  }

  const headingId = `${config.sectionId}-title`;
  const containerClass = contained
    ? 'mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8'
    : 'w-full py-6';

  return (
    <section
      id={config.sectionId}
      aria-labelledby={config.headingKey === null ? undefined : headingId}
      className={containerClass}
    >
      {videoObjects.length === 0 ? null : (
        <script type="application/ld+json">
          {serializeJsonLd(buildVideoObjectsJsonLd(videoObjects))}
        </script>
      )}
      {config.headingKey === null ? null : (
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2
            id={headingId}
            className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t(config.headingKey)}
          </h2>
          {config.introKey === null ? null : (
            <p className="text-muted-foreground mt-3">{t(config.introKey)}</p>
          )}
        </div>
      )}
      <MarketingVideoGallery layout={config.layout} items={items} />
    </section>
  );
}
