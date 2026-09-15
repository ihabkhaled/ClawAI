import { MARKETING_FOOTER_EXPLORE_PATHS } from '@/constants/marketing-footer.constants';
import type { Locale } from '@/enums/locale.enum';
import type { MarketingFooterProps } from '@/types/marketing.types';

import { getPublishedPagesForLocale } from './content-registry.utility';
import { buildComparisonRailItems, getComparisonContent } from './public-comparison.utility';

/**
 * The footer's registry-derived links, resolved once on the server.
 *
 * Lives here rather than in the footer component because the footer is
 * 'use client' (it needs useTranslation), and reading the content registry
 * from there pulled every marketing cluster's long-form prose — 13 languages
 * of it — into the shared client chunk. Nothing about the rendered footer
 * changed; only where the data is computed.
 *
 * NOT exported from the `@/utilities` barrel on purpose: that barrel is
 * imported by client components, and re-exporting this would put the registry
 * straight back into their graph.
 */
export function buildMarketingFooterData(locale: Locale): MarketingFooterProps {
  const comparisonContent = getComparisonContent(locale);
  return {
    explorePages: getPublishedPagesForLocale(locale)
      .filter((page) => MARKETING_FOOTER_EXPLORE_PATHS.has(page.canonicalPath))
      .map((page) => ({ slug: page.slug, canonicalPath: page.canonicalPath, title: page.title })),
    // Comparison pages get their own column rather than joining Explore. Every
    // one of them then carries a site-wide inbound link — the thing that
    // decides whether a new page is crawled in days or months — without
    // turning one footer column into a nineteen-item list.
    comparisons: buildComparisonRailItems(comparisonContent, locale).map((item) => ({
      rival: item.rival,
      path: item.path,
      summary: item.summary,
    })),
    comparisonsHeading: comparisonContent.hub.eyebrow,
  };
}
