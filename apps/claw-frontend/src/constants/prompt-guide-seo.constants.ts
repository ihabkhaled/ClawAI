import { PROMPT_GUIDE_CONTENT_BY_LOCALE } from '@/constants/prompt-guide-content.constants';
import {
  PROMPTS_HUB_SLUG,
  PROMPT_GUIDE_TOPIC_ORDER,
  getPromptGuideTopicSlug,
} from '@/constants/prompts.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/prompts` cluster's SEO copy, keyed the way the content registry
 * looks it up. See `learn-seo.constants.ts` for why this lives beside the
 * body copy instead of in `public-page-seo.constants.ts`.
 */
export const PROMPT_GUIDE_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = PROMPT_GUIDE_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [PROMPTS_HUB_SLUG]: content.hub.seo,
      };
      for (const topic of PROMPT_GUIDE_TOPIC_ORDER) {
        bySlug[getPromptGuideTopicSlug(topic)] = content.topics[topic].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
