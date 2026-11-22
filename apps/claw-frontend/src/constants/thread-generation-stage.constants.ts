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

/**
 * Stages a step row can carry beyond the job's own stages: the step log files the planning call
 * before research under BRIEF, the formatting pass under FORMAT, and any other service call under
 * SYSTEM. Mirrors `ROLE_KEY_PREFIXES` / `SYSTEM_STEP_INFO` in claw-thread-generation-service.
 */
export const THREAD_STEP_STAGE_LABEL_KEYS: Readonly<Record<string, string>> = {
  BRIEF: 'chat.threadStageBrief',
  FORMAT: 'chat.threadStageFormat',
  SYSTEM: 'chat.threadStageSystem',
};
