import type {
  FeaturesClusterDictionary,
  FeaturesClusterFoundationDictionary,
  FeaturesFlagshipDictionary,
} from '@/types/features-cluster.types';

/**
 * Joins a locale's original six capability pages with its flagship pages into
 * the one dictionary the `/features` cluster renders from. The flagship intro
 * replaces the hub intro, which used to count six pages.
 */
export function mergeFeaturesClusterDictionary(
  foundation: FeaturesClusterFoundationDictionary,
  flagship: FeaturesFlagshipDictionary,
): FeaturesClusterDictionary {
  return {
    labels: foundation.labels,
    hub: {
      capabilitiesHeading: foundation.hub.capabilitiesHeading,
      capabilitiesIntro: flagship.capabilitiesIntro,
      cardSummaries: { ...foundation.hub.cardSummaries, ...flagship.cardSummaries },
    },
    capabilities: { ...foundation.capabilities, ...flagship.capabilities },
  };
}
