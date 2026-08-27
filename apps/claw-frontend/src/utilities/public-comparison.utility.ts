import { COMPARISON_CONTENT_BY_LOCALE } from '@/constants/public-comparison-content.constants';
import {
  COMPARISON_DIMENSION_ORDER,
  COMPARISON_PATH_BY_RIVAL,
  COMPARISON_RIVAL_ORDER,
  COMPARISON_RIVAL_TOKEN,
  COMPARISON_SLUG_BY_RIVAL,
} from '@/constants/public-comparison.constants';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import type { Locale } from '@/enums/locale.enum';
import type {
  ComparisonDictionary,
  ComparisonHubCardItem,
  ComparisonMatrixRow,
  ComparisonRailItem,
} from '@/types/public-comparison.types';
import { localisePath } from '@/utilities/locale.utility';

export function getComparisonContent(locale: Locale): ComparisonDictionary {
  return COMPARISON_CONTENT_BY_LOCALE[locale];
}

/**
 * Puts the rival's name into a translated sentence.
 *
 * `replaceAll` rather than `replace` so a translation that needs the name twice
 * ("Choose {rival} if {rival} already runs your office") is not silently
 * half-substituted.
 */
export function formatComparisonLabel(template: string, rivalName: string): string {
  return template.replaceAll(COMPARISON_RIVAL_TOKEN, rivalName);
}

export function getComparisonSlug(rival: ComparisonRival): LaunchPublicPageSlug {
  return COMPARISON_SLUG_BY_RIVAL[rival];
}

export function getComparisonPath(rival: ComparisonRival): string {
  return COMPARISON_PATH_BY_RIVAL[rival];
}

export function isComparisonRival(value: string): value is ComparisonRival {
  return (Object.values(ComparisonRival) as string[]).includes(value);
}

export function buildComparisonRows(
  content: ComparisonDictionary,
  rival: ComparisonRival,
): ComparisonMatrixRow[] {
  const rivalContent = content.rivals[rival];
  return COMPARISON_DIMENSION_ORDER.map((dimension) => ({
    dimension,
    label: content.dimensionLabels[dimension],
    claw: content.clawCells[dimension],
    rival: rivalContent.cells[dimension],
  }));
}

/**
 * The cross-link rail.
 *
 * `exclude` drops the page you are already on, so a comparison page links to the
 * other four rather than to itself — a self-link in a "see also" list is a dead
 * click and a wasted internal link.
 */
export function buildComparisonRailItems(
  content: ComparisonDictionary,
  locale: Locale,
  exclude?: ComparisonRival,
): ComparisonRailItem[] {
  return COMPARISON_RIVAL_ORDER.filter((rival) => rival !== exclude).map((rival) => ({
    rival,
    name: content.rivals[rival].name,
    path: getComparisonPath(rival),
    href: localisePath(getComparisonPath(rival), locale),
    summary: content.rivals[rival].eyebrow,
  }));
}

/** Hub cards: the same items as the rail, each with its own formatted call to action. */
export function buildComparisonHubCards(
  content: ComparisonDictionary,
  locale: Locale,
): ComparisonHubCardItem[] {
  return buildComparisonRailItems(content, locale).map((item) => ({
    ...item,
    cta: formatComparisonLabel(content.hub.cardCta, item.name),
  }));
}
