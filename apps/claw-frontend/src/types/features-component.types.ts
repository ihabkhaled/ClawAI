import type { FeatureCapability } from '@/enums/feature-capability.enum';
import type {
  FeatureCapabilityCard,
  FeatureCapabilitySiblingLink,
} from '@/types/features-cluster.types';

export type FeatureCapabilityCardsProps = {
  cards: ReadonlyArray<FeatureCapabilityCard>;
};

export type FeatureCapabilityRailProps = {
  label: string;
  items: ReadonlyArray<FeatureCapabilitySiblingLink>;
};

export type FeatureCapabilityPageProps = {
  capability: FeatureCapability;
};
