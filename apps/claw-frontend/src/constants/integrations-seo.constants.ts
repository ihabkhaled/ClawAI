import { INTEGRATIONS_CONTENT_BY_LOCALE } from '@/constants/integrations-content.constants';
import {
  INTEGRATIONS_HUB_SLUG,
  INTEGRATION_TOPIC_ORDER,
  getIntegrationSlug,
} from '@/constants/integrations.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/integrations` cluster's SEO copy, keyed the way the content registry
 * looks it up. See `learn-seo.constants.ts` for why this lives beside the body
 * copy instead of in `public-page-seo.constants.ts`.
 */
export const INTEGRATIONS_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = INTEGRATIONS_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [INTEGRATIONS_HUB_SLUG]: content.hub.seo,
      };
      for (const topic of INTEGRATION_TOPIC_ORDER) {
        bySlug[getIntegrationSlug(topic)] = content.topics[topic].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
