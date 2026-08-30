import { LEARN_CONTENT_BY_LOCALE } from '@/constants/learn-content.constants';
import { LEARN_HUB_SLUG, LEARN_TOPIC_ORDER, getLearnTopicSlug } from '@/constants/learn.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The `/learn` cluster's SEO copy, keyed the way the content registry looks it
 * up.
 *
 * Derived from the cluster's own content dictionaries rather than maintained
 * separately: the title and description a page renders and the ones a search
 * engine sees come from one object, so they cannot disagree. That is the same
 * reason the FAQ structured data is built from the rendered array.
 */
export const LEARN_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = LEARN_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {
        [LEARN_HUB_SLUG]: content.hub.seo,
      };
      for (const topic of LEARN_TOPIC_ORDER) {
        bySlug[getLearnTopicSlug(topic)] = content.topics[topic].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
