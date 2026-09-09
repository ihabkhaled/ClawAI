import { COMPARE_MODELS_CONTENT_BY_LOCALE } from '@/constants/compare-models-content.constants';
import {
  MODEL_FAMILY_PAIR_ORDER,
  MODEL_FAMILY_PAIR_RELATED_PATHS,
  getModelFamilyPairPath,
} from '@/constants/compare-models.constants';
import type { Locale } from '@/enums/locale.enum';
import type { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type {
  CompareModelsDictionary,
  CompareModelsHubCard,
  CompareModelsRelatedLink,
  CompareModelsSiblingLink,
  ResolvedCompareModelsPair,
} from '@/types/compare-models.types';
import { localisePath } from '@/utilities/locale.utility';

export function getCompareModelsContent(locale: Locale): CompareModelsDictionary {
  return COMPARE_MODELS_CONTENT_BY_LOCALE[locale];
}

export function getCompareModelsPairContent(
  locale: Locale,
  pair: ModelFamilyPair,
): ResolvedCompareModelsPair {
  return getCompareModelsContent(locale).pairs[pair];
}

/** The hub's pair cards, in render order, already localised. */
export function buildCompareModelsHubCards(locale: Locale): CompareModelsHubCard[] {
  const content = getCompareModelsContent(locale);
  return MODEL_FAMILY_PAIR_ORDER.map((pair) => ({
    pair,
    title: content.pairs[pair].title,
    summary: content.hub.cardSummaries[pair],
    href: localisePath(getModelFamilyPairPath(pair), locale),
  }));
}

export function buildCompareModelsRelatedLinks(
  locale: Locale,
  pair: ModelFamilyPair,
): CompareModelsRelatedLink[] {
  return MODEL_FAMILY_PAIR_RELATED_PATHS[pair].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling pairs for the in-page rail, capped at four, wrapping the order array. */
export function buildCompareModelsSiblings(
  locale: Locale,
  exclude: ModelFamilyPair,
): CompareModelsSiblingLink[] {
  const content = getCompareModelsContent(locale);
  const order = MODEL_FAMILY_PAIR_ORDER.filter((pair) => pair !== exclude);
  const index = MODEL_FAMILY_PAIR_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((pair) => ({
    pair,
    title: content.pairs[pair].title,
    href: localisePath(getModelFamilyPairPath(pair), locale),
  }));
}
