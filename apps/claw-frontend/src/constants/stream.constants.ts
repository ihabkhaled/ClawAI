import { AiStreamStage } from '@/enums';

// Maps a lifecycle stage to its i18n key for the stage badge. Keys live under
// chat.stream.stage.* in every locale.
export const STREAM_STAGE_LABEL_KEYS: Readonly<Record<AiStreamStage, string>> = {
  [AiStreamStage.QUEUED]: 'chat.stream.stage.queued',
  [AiStreamStage.RESOLVING_ROUTE]: 'chat.stream.stage.resolvingRoute',
  [AiStreamStage.RETRIEVING_CONTEXT]: 'chat.stream.stage.retrievingContext',
  [AiStreamStage.CONNECTING_PROVIDER]: 'chat.stream.stage.connecting',
  [AiStreamStage.AUTHENTICATING]: 'chat.stream.stage.authenticating',
  [AiStreamStage.WAITING_FIRST_TOKEN]: 'chat.stream.stage.waitingFirstToken',
  [AiStreamStage.THINKING]: 'chat.stream.stage.thinking',
  [AiStreamStage.GENERATING]: 'chat.stream.stage.generating',
  [AiStreamStage.TOOL_CALLING]: 'chat.stream.stage.toolCalling',
  [AiStreamStage.CRITIQUING]: 'chat.stream.stage.critiquing',
  [AiStreamStage.JUDGING]: 'chat.stream.stage.judging',
  [AiStreamStage.RESEARCH_STARTED]: 'chat.stream.stage.researchStarted',
  [AiStreamStage.RESEARCH_SOURCES_FOUND]: 'chat.stream.stage.researchSourcesFound',
  [AiStreamStage.RESEARCH_FETCHING]: 'chat.stream.stage.researchFetching',
  [AiStreamStage.RESEARCH_COMPLETED]: 'chat.stream.stage.researchCompleted',
  [AiStreamStage.RESEARCH_FAILED]: 'chat.stream.stage.researchFailed',
  [AiStreamStage.FINALIZING]: 'chat.stream.stage.finalizing',
  [AiStreamStage.COMPLETE]: 'chat.stream.stage.complete',
  [AiStreamStage.INCOMPLETE]: 'chat.stream.stage.incomplete',
  [AiStreamStage.RETRYING]: 'chat.stream.stage.retrying',
  [AiStreamStage.RATE_LIMITED]: 'chat.stream.stage.rateLimited',
  [AiStreamStage.CANCELLED]: 'chat.stream.stage.cancelled',
  [AiStreamStage.ERROR]: 'chat.stream.stage.error',
};

// Reasoning-visibility → i18n label key for the thinking panel header.
export const REASONING_VISIBILITY_LABEL_KEYS: Readonly<Record<string, string>> = {
  provider_exposed: 'chat.stream.reasoning.providerExposed',
  model_emitted: 'chat.stream.reasoning.modelEmitted',
  summary_only: 'chat.stream.reasoning.summaryOnly',
  none: 'chat.stream.reasoning.none',
};
