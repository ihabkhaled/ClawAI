import { AiStreamStage } from '../../../common/enums';

// Baseline ("floor") progress percent when a run enters each lifecycle stage.
// During GENERATING the percent additionally ramps with generated tokens.
export const STAGE_PROGRESS_FLOOR: Readonly<Record<string, number>> = {
  [AiStreamStage.QUEUED]: 2,
  [AiStreamStage.RESOLVING_ROUTE]: 6,
  [AiStreamStage.RETRIEVING_CONTEXT]: 12,
  [AiStreamStage.CONNECTING_PROVIDER]: 18,
  [AiStreamStage.AUTHENTICATING]: 22,
  [AiStreamStage.WAITING_FIRST_TOKEN]: 30,
  [AiStreamStage.THINKING]: 38,
  [AiStreamStage.GENERATING]: 45,
  [AiStreamStage.TOOL_CALLING]: 60,
  [AiStreamStage.FINALIZING]: 96,
  [AiStreamStage.COMPLETE]: 100,
};

// Generation ramp: percent = GEN_FLOOR + GEN_SPAN * progressFraction, capped at
// GEN_CEILING until the run is actually done. With a known maxOutputTokens the
// fraction is generatedTokens/maxOutputTokens; otherwise an asymptotic curve
// (1 - e^(-generatedTokens / TOKEN_RAMP_SCALE)) approaches the ceiling.
export const GENERATING_FLOOR_PERCENT = 45;
export const GENERATING_SPAN_PERCENT = 50;
export const GENERATING_CEILING_PERCENT = 95;
export const FINALIZING_CEILING_PERCENT = 99;
export const COMPLETE_PERCENT = 100;
export const TOKEN_RAMP_SCALE = 300;

// Minimum gap between METRICS events pushed to the client, to avoid UI jank.
export const METRICS_THROTTLE_MS = 80;

// Simulated streaming (provider could not stream): how the buffered full
// response is chunked back out so the UI still animates token-by-token.
export const SIMULATED_CHUNK_SIZE_CHARS = 24;
export const SIMULATED_CHUNK_DELAY_MS = 14;
