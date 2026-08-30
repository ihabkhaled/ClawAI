import { INTEGRATIONS_PAGE_SEO_BY_LOCALE } from '@/constants/integrations-seo.constants';
import { LEARN_PAGE_SEO_BY_LOCALE } from '@/constants/learn-seo.constants';
import { PUBLIC_PAGE_SEO_BY_LOCALE } from '@/constants/public-page-seo.constants';
import type { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/**
 * Where a page's title/description/keywords come from, for any slug.
 *
 * WHY THIS EXISTS
 * ---------------
 * `PUBLIC_PAGE_SEO_BY_LOCALE` is one exhaustive
 * `Record<Locale, Record<LaunchPublicPageSlug, PublicPageSeoCopy>>`. It is
 * 2,391 lines and 168 KB for the 28 launch pages, and the exhaustiveness is
 * load-bearing: adding a slug forces all thirteen locale blocks or typecheck
 * fails. That is a good property at 28 slugs.
 *
 * At ~128 slugs the same property produces ~10,900 lines and ~770 KB in ONE
 * literal — the shape TypeScript checks superlinearly — and every content batch
 * would edit that single file, so batches conflict in it by construction.
 *
 * So the launch set keeps its file, and each new cluster ships its SEO copy
 * beside its body copy in `constants/<cluster>-content/<locale>.constants.ts`,
 * the shape `public-comparison-content/` already established. This registry is
 * the seam: one lookup, several sources, no god-file.
 *
 * ADDING A CLUSTER
 * ----------------
 * Append its per-locale SEO map to `CLUSTER_SEO_SOURCES`. Exhaustiveness is
 * still enforced, just per cluster instead of globally — a cluster's own
 * `Record<Locale, Record<ItsSlug, PublicPageSeoCopy>>` fails typecheck if a
 * locale or a slug is missing.
 */
type LocaleSeoSource = Readonly<Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>>;

/**
 * Cluster SEO sources, in resolution order.
 *
 * Order only matters if two sources claim the same slug, which
 * `content-registry.utility.test.ts` forbids. The launch map is consulted first
 * regardless, so a cluster can never shadow an existing page.
 */
const CLUSTER_SEO_SOURCES: ReadonlyArray<LocaleSeoSource> = [
  LEARN_PAGE_SEO_BY_LOCALE,
  INTEGRATIONS_PAGE_SEO_BY_LOCALE,
];

/**
 * The SEO copy for one slug in one locale, or `undefined` if no source has it.
 *
 * Returns `undefined` rather than throwing or substituting a placeholder: the
 * caller (`buildLocalizedMetadata`) knows what an absent entry means for the
 * registry, and a silently-substituted title is how an English string ends up
 * under a Japanese URL.
 */
export function resolvePublicPageSeo(locale: Locale, slug: string): PublicPageSeoCopy | undefined {
  const launchCopy = (PUBLIC_PAGE_SEO_BY_LOCALE[locale] as Record<string, PublicPageSeoCopy>)[slug];
  if (launchCopy !== undefined) {
    return launchCopy;
  }
  for (const source of CLUSTER_SEO_SOURCES) {
    const clusterCopy = source[locale][slug];
    if (clusterCopy !== undefined) {
      return clusterCopy;
    }
  }
  return undefined;
}

/** Every slug any source can answer for, in a locale. Used by coverage tests. */
export function listSlugsWithSeo(locale: Locale): string[] {
  return [
    ...Object.keys(PUBLIC_PAGE_SEO_BY_LOCALE[locale]),
    ...CLUSTER_SEO_SOURCES.flatMap((source) => Object.keys(source[locale])),
  ];
}
