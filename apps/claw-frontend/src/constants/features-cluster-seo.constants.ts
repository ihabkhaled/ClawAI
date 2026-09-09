import { FEATURES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/features-cluster-content.constants';
import {
  FEATURES_CAPABILITY_ORDER,
  getFeatureCapabilitySlug,
} from '@/constants/features-cluster.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * The 6 `/features/<capability>` child pages' SEO copy, keyed the way the
 * content registry looks it up. The hub's own SEO stays on the pre-existing
 * `PUBLIC_PAGE_SEO_BY_LOCALE['features']` entry — untouched, per F4 (no
 * redirect, no lost equity) — so this map carries only the 6 children.
 */
export const FEATURES_CLUSTER_PAGE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = Object.freeze(
  Object.values(Locale).reduce(
    (byLocale, locale) => {
      const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale];
      const bySlug: Record<string, PublicPageSeoCopy> = {};
      for (const capability of FEATURES_CAPABILITY_ORDER) {
        bySlug[getFeatureCapabilitySlug(capability)] = content.capabilities[capability].seo;
      }
      byLocale[locale] = bySlug;
      return byLocale;
    },
    {} as Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>,
  ),
);
