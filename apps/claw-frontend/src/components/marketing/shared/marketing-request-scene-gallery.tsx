import { headers } from 'next/headers';

import { MarketingSceneGallery } from '@/components/marketing/shared/marketing-scene-gallery';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type { MarketingRequestSceneGalleryProps } from '@/types/marketing-scenes.types';
import { isSupportedLocale } from '@/utilities/locale.utility';

/**
 * The gallery for pages that are plain section lists and never resolved the request locale
 * themselves. Editorial pages already hold the locale and use `MarketingSceneGallery` directly,
 * which keeps them renderable without an async child.
 */
export async function MarketingRequestSceneGallery(
  props: MarketingRequestSceneGalleryProps,
): Promise<React.ReactElement | null> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  return <MarketingSceneGallery {...props} locale={locale} />;
}
