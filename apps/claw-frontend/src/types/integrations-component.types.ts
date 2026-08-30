import type { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationHubCard, IntegrationSiblingLink } from '@/types/integrations.types';

export type IntegrationHubCardsProps = {
  cards: ReadonlyArray<IntegrationHubCard>;
};

export type IntegrationRailProps = {
  label: string;
  items: ReadonlyArray<IntegrationSiblingLink>;
};

export type IntegrationTopicPageProps = {
  topic: IntegrationTopic;
};

export type IntegrationCapabilitiesProps = {
  heading: string;
  readLabel: string;
  writeLabel: string;
  syncLabel: string;
  realTimeLabel: string;
  pollBasedLabel: string;
  readableObjects: readonly string[];
  writeActions: readonly string[];
  isRealTime: boolean;
};
