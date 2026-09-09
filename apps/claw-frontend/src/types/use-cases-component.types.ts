import type { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCaseHubCard, UseCaseSiblingLink } from '@/types/use-cases-cluster.types';

export type UseCaseHubCardsProps = {
  cards: ReadonlyArray<UseCaseHubCard>;
};

export type UseCaseRailProps = {
  label: string;
  items: ReadonlyArray<UseCaseSiblingLink>;
};

export type UseCaseTaskPageProps = {
  task: UseCaseTask;
};
