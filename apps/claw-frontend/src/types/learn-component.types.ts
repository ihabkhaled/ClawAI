import type { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnHubCard, LearnSiblingLink } from '@/types/learn.types';

export type LearnTopicCardsProps = {
  cards: ReadonlyArray<LearnHubCard>;
};

export type LearnRailProps = {
  label: string;
  items: ReadonlyArray<LearnSiblingLink>;
};

export type LearnTopicPageProps = {
  topic: LearnTopic;
};
