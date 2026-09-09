import type { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitHubCard, ModelFitSiblingLink } from '@/types/model-fit.types';

export type ModelFitHubCardsProps = {
  cards: ReadonlyArray<ModelFitHubCard>;
};

export type ModelFitRailProps = {
  label: string;
  items: ReadonlyArray<ModelFitSiblingLink>;
};

export type ModelFitTaskPageProps = {
  task: ModelFitTask;
};
