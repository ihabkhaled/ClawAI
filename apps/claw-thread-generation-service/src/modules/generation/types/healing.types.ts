import type {
  ThreadFailureClass,
  ThreadHealingCandidate,
  ThreadHealingPool,
  ThreadHealingStrategy,
} from '@claw/shared-types';

import type { z } from 'zod';

import type { CandidateOrigin } from '../../../common/enums/candidate-origin.enum';
import type { CandidateOutcome } from './candidate-outcome.types';
import type { ChatModelRequest, ChatModelResponse } from '../../models/chat-model.client';
import type { GenerationPipelineInput, ModelRole } from './generation-pipeline.types';
import type { StepRecordInput } from './step-recorder.types';

export type QueuedCandidate = ThreadHealingCandidate & { origin: CandidateOrigin };

/** What to change before the same model is asked again. */
export type OnModelStep = {
  strategy: ThreadHealingStrategy;
  maxOutputTokens: number;
  /** Appended to the prompt; empty for a plain wait. */
  note: string;
  delayMs: number;
  shrinkSource: boolean;
  repairPass: boolean;
};

export type LadderState = {
  failureClass: ThreadFailureClass;
  used: ReadonlySet<ThreadHealingStrategy>;
  baseMaxOutputTokens: number;
  currentMaxOutputTokens: number;
  retryAfterMs: number | null;
  /** Count of backoff waits already taken on this model, for the exponential delay. */
  waits: number;
  reason: string;
  /** Locale factor for the output limit, already applied by the caller's helper. */
  raisedMaxOutputTokens: number;
};

/** Counters that bound healing for one job attempt; shared by every role call of it. */
export type HealingBudget = {
  jobAttemptsLeft: number;
  spendCapMicroUsd: number | null;
  spentMicroUsd: number;
};

export type AttemptFailure = {
  failure: CandidateOutcome;
  error: unknown;
  deterministic: boolean;
  /** Nothing on this side can help (owner's credit, entitlement, safety): stop the role at once. */
  ownerOnly: boolean;
};

export type RoleAttempt = { response: ChatModelResponse } | AttemptFailure;

export type PlanNextState = {
  failureClass: ThreadFailureClass;
  used: ReadonlySet<ThreadHealingStrategy>;
  input: GenerationPipelineInput;
  spec: RoleCallSpec;
  maxOutputTokens: number;
  waits: number;
  retryAfterMs: number | null;
  reason: string;
  lastReply: string;
};

/** One entry of a draft's citation list, read against the evidence bundle. */
export type ListedCitation = {
  resolved: string | null;
  kept: string | null;
  ordinal: string | null;
};

export type CandidateHealth = { ok: number; failed: number };

export type CandidateQueueInput = {
  role: ModelRole;
  healing: ThreadHealingPool | undefined;
  /** `provider/model` keys that failed this role for a model-specific reason earlier in the job. */
  demoted: ReadonlySet<string>;
  health: ReadonlyMap<string, CandidateHealth>;
  /** Estimated prompt plus output tokens; a pool model that publishes a smaller window is skipped. */
  neededTokens: number;
};

export type RolePrompt = {
  systemPrompt: string;
  userPrompt: string;
  /** The shared material the user prompt starts with; replaced by a shorter copy when shrinking. */
  sharedMaterial?: string;
};

/** What one role call needs besides the job: who, which reply is accepted, what shape it has. */
export type RoleCallSpec = {
  role: ModelRole;
  roleKey: string;
  round: number;
  prompt: RolePrompt;
  accepts: z.ZodType;
  /** The JSON shape named to the repair pass. */
  shapeHint: string;
};

/** Everything the healer needs from the pipeline; replaced by fakes in specs. */
export type HealerDeps = {
  generate: (request: ChatModelRequest) => Promise<ChatModelResponse>;
  record: (jobId: string, step: StepRecordInput) => Promise<void>;
  recordSpend: (jobId: string, budgetId: string, microUsd: number | undefined) => Promise<void>;
  throwIfCancelled: (input: GenerationPipelineInput) => Promise<void>;
  loadHealth: () => Promise<ReadonlyMap<string, CandidateHealth>>;
  loadDemoted: (jobId: string, roleId: string) => Promise<ReadonlySet<string>>;
  wait: (ms: number, signal: AbortSignal | undefined) => Promise<void>;
  now: () => number;
  random: () => number;
};
