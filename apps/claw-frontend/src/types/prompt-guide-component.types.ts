import type { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideHubCard, PromptGuideSiblingLink } from '@/types/prompt-guide.types';

export type PromptGuideHubCardsProps = {
  cards: ReadonlyArray<PromptGuideHubCard>;
};

export type PromptGuideRailProps = {
  label: string;
  items: ReadonlyArray<PromptGuideSiblingLink>;
};

export type PromptGuideTopicPageProps = {
  topic: PromptGuideTopic;
};
