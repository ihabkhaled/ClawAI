import { USE_CASES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/use-cases-cluster-content.constants';
import { USE_CASES_TASK_ORDER, getUseCaseTaskSlug } from '@/constants/use-cases-cluster.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The 7 `/use-cases/<task>` child pages' SEO copy, keyed the way the
 * content registry looks it up. The hub's own SEO stays on the pre-existing
 * `PUBLIC_PAGE_SEO_BY_LOCALE['use-cases']` entry — untouched, per F4 (no
 * redirect, no lost equity) — so this map carries only the 7 children.
 */
export const USE_CASES_CLUSTER_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {};
      for (const task of USE_CASES_TASK_ORDER) {
        bySlug[getUseCaseTaskSlug(task)] = content.tasks[task].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
