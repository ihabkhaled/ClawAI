import { ThreadGenerationStage } from '@/enums/thread-generation-stage.enum';

/** The i18n key that says, in words, what a running Thread is doing at each stage. */
export const THREAD_STAGE_LABEL_KEYS: Readonly<Record<ThreadGenerationStage, string>> = {
  [ThreadGenerationStage.Snapshot]: 'chat.threadStageSnapshot',
  [ThreadGenerationStage.Research]: 'chat.threadStageResearch',
  [ThreadGenerationStage.AuthorDrafts]: 'chat.threadStageAuthorDrafts',
  [ThreadGenerationStage.Consensus]: 'chat.threadStageConsensus',
  [ThreadGenerationStage.Judge]: 'chat.threadStageJudge',
  [ThreadGenerationStage.Critic]: 'chat.threadStageCritic',
  // A revision is the next round of drafts, so it reads the same.
  [ThreadGenerationStage.Revision]: 'chat.threadStageAuthorDrafts',
  [ThreadGenerationStage.ReadyForReview]: 'chat.threadStageReady',
};
