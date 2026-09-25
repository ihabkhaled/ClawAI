import type { PaygHold } from '@claw/shared-entitlements';

import type { HelperExecutionKind } from '../../../common/enums/helper-execution-kind.enum';
import type { VisionHelperOutcome } from '../../../common/enums/vision-helper-outcome.enum';
import type { AssembledContext, FileContentResponse } from './context.types';
import type { LlmResponse } from './execution.types';

/** One VISION_HELPER candidate as routing-service serves it. */
export interface VisionHelperCandidateWire {
  provider: string;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}

/** A candidate in chat-service's provider vocabulary, ready to call. */
export type VisionHelperCandidate = {
  provider: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
};

export type CachedVisionHelperCandidates = {
  candidates: readonly VisionHelperCandidateWire[];
  expiresAt: number;
};

/**
 * One helper call recorded on the assistant message
 * (`metadata.helperExecutions`) and the `visionHelper` log line. Carries no
 * image content and no observation text.
 */
export type HelperExecution = {
  kind: HelperExecutionKind;
  provider: string;
  model: string;
  fileId: string;
  latencyMs: number;
  outcome: VisionHelperOutcome;
};

/** The description a blind lane receives for one image. */
export type DerivedImageObservation = {
  fileId: string;
  filename: string;
  helperProvider: string;
  helperModel: string;
  text: string;
};

/** How one image's helper walk ended, shared by every lane of the turn. */
export type VisionHelperResult = {
  fileId: string;
  outcome: VisionHelperOutcome;
  observation?: DerivedImageObservation;
  executions: HelperExecution[];
};

/** What the manager hands the execution chokepoint for one helper call. */
export type VisionHelperProviderCall = {
  provider: string;
  model: string;
  context: AssembledContext;
  hold: PaygHold;
  requestId: string;
};

/**
 * Places the helper's provider call through `ChatExecutionManager.callProvider`
 * with the hold the manager took, so it finalizes on measured usage or
 * releases on a throw exactly like every other paid call.
 */
export type VisionHelperInvoker = (call: VisionHelperProviderCall) => Promise<LlmResponse>;

/** One attempt's inputs. */
export type VisionHelperAttemptInput = {
  context: AssembledContext;
  imageContext: AssembledContext;
  fileId: string;
  candidate: VisionHelperCandidate;
  requestId: string;
  invoke: VisionHelperInvoker;
};

export type VisionHelperCacheEntry = {
  result: Promise<VisionHelperResult>;
  expiresAt: number;
};

/** A call raced against its deadline. */
export type DeadlineResult<T> = { timedOut: true } | { timedOut: false; value: T };

/** How one attempt ended, before it is logged and recorded. */
export type VisionHelperAttemptResult = {
  outcome: VisionHelperOutcome;
  text?: string;
  execution: HelperExecution;
};

/** A lane's file text after descriptions and other files share one file budget. */
export type LaneFileShareFit = {
  derivedImages: DerivedImageObservation[];
  fileContents: FileContentResponse[];
};
