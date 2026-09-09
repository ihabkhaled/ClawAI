import { COMPARE_MODELS_CONTENT_BY_LOCALE } from '@/constants/compare-models-content.constants';
import {
  COMPARE_MODELS_HUB_SLUG,
  MODEL_FAMILY_PAIR_ORDER,
  getModelFamilyPairSlug,
} from '@/constants/compare-models.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/compare/models` cluster's SEO copy, keyed the way the content
 * registry looks it up. See `model-fit-seo.constants.ts` for why this lives
 * beside the body copy instead of in `public-page-seo.constants.ts`.
 */
export const COMPARE_MODELS_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [COMPARE_MODELS_HUB_SLUG]: content.hub.seo,
      };
      for (const pair of MODEL_FAMILY_PAIR_ORDER) {
        bySlug[getModelFamilyPairSlug(pair)] = content.pairs[pair].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
