import { MODEL_FIT_CONTENT_BY_LOCALE } from '@/constants/model-fit-content.constants';
import {
  MODEL_FIT_HUB_SLUG,
  MODEL_FIT_TASK_ORDER,
  getModelFitTaskSlug,
} from '@/constants/model-fit.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/model-fit` cluster's SEO copy, keyed the way the content registry
 * looks it up. See `learn-seo.constants.ts` for why this lives beside the
 * body copy instead of in `public-page-seo.constants.ts`.
 */
export const MODEL_FIT_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = MODEL_FIT_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [MODEL_FIT_HUB_SLUG]: content.hub.seo,
      };
      for (const task of MODEL_FIT_TASK_ORDER) {
        bySlug[getModelFitTaskSlug(task)] = content.tasks[task].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
