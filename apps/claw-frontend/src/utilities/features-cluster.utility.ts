import { FEATURES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/features-cluster-content.constants';
import {
  FEATURES_RELATED_PATHS,
  FEATURES_CAPABILITY_ORDER,
  getFeatureCapabilityPath,
} from '@/constants/features-cluster.constants';
import type { FeatureCapability } from '@/enums/feature-capability.enum';
import type { Locale } from '@/enums/locale.enum';
import type {
  FeatureCapabilityCard,
  FeatureCapabilityContent,
  FeatureCapabilitySiblingLink,
  FeatureRelatedLink,
  FeaturesClusterDictionary,
} from '@/types/features-cluster.types';
import { localisePath } from '@/utilities/locale.utility';

export function getFeaturesClusterContent(locale: Locale): FeaturesClusterDictionary {
  return FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale];
}

export function getFeatureCapabilityContent(
  locale: Locale,
  capability: FeatureCapability,
): FeatureCapabilityContent {
  return getFeaturesClusterContent(locale).capabilities[capability];
}

/** The hub's capability cards, in render order, already localised. */
export function buildFeatureCapabilityCards(locale: Locale): FeatureCapabilityCard[] {
  const content = getFeaturesClusterContent(locale);
  return FEATURES_CAPABILITY_ORDER.map((capability) => ({
    capability,
    title: content.capabilities[capability].title,
    summary: content.hub.cardSummaries[capability],
    href: localisePath(getFeatureCapabilityPath(capability), locale),
  }));
}

export function buildFeatureRelatedLinks(
  locale: Locale,
  capability: FeatureCapability,
): FeatureRelatedLink[] {
  return FEATURES_RELATED_PATHS[capability].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling capabilities for the in-page rail, capped at four, wrapping the order array. */
export function buildFeatureCapabilitySiblings(
  locale: Locale,
  exclude: FeatureCapability,
): FeatureCapabilitySiblingLink[] {
  const content = getFeaturesClusterContent(locale);
  const order = FEATURES_CAPABILITY_ORDER.filter((capability) => capability !== exclude);
  const index = FEATURES_CAPABILITY_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((capability) => ({
    capability,
    title: content.capabilities[capability].title,
    href: localisePath(getFeatureCapabilityPath(capability), locale),
  }));
}
