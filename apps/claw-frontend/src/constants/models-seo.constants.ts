import { MODELS_CONTENT_BY_LOCALE } from '@/constants/models-content.constants';
import {
  MODELS_HUB_SLUG,
  MODEL_PROVIDER_ORDER,
  getModelProviderSlug,
} from '@/constants/models.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/models` cluster's SEO copy, keyed the way the content registry looks
 * it up. See `learn-seo.constants.ts` for why this lives beside the body copy
 * instead of in `public-page-seo.constants.ts`.
 */
export const MODELS_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = MODELS_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [MODELS_HUB_SLUG]: content.hub.seo,
      };
      for (const provider of MODEL_PROVIDER_ORDER) {
        bySlug[getModelProviderSlug(provider)] = content.providers[provider].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
