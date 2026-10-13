import type { AssembledContext } from './context.types';
import type { CreditRefusalRecord } from './credit-fallback.types';
import type { AttemptRecord } from './fallback-executor.types';
import type { SearchFirstOutcome } from './search-first.types';
import type { ExecutionOptions } from './execution-options.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from './execution.types';

/**
 * Discriminated outcome of a single candidate-provider attempt inside the
 * ChatExecutionManager.execute() loop. Lets the loop drive control flow
 * (return / continue / record-error) without nesting all the policy logic
 * inside the loop body.
 */
export type CandidateOutcome =
  | { kind: 'success'; response: LlmResponse }
  | { kind: 'reRoute'; reasons: string[] }
  | { kind: 'failure'; error: unknown };

/**
 * The block of execution-path metadata that gets stamped onto every
 * successful response (fast/standard, escalated, target latency).
 */
export type ExecutionMetadata = {
  fastPathUsed: boolean;
  fastPathEscalated: boolean;
  executionPath: 'fast' | 'fast_escalated' | 'standard';
  targetLatencyMs: number;
};

/**
 * Args bag for ChatExecutionManager.runCandidate(). Single-purpose type so
 * the per-candidate body can be split across small helpers without
 * duplicating a 12-parameter signature.
 */
export type RunCandidateArgs = {
  candidate: { provider: string; model: string };
  candidateIndex: number;
  candidates: Array<{ provider: string; model: string }>;
  payload: MessageRoutedData;
  context: AssembledContext;
  executionContext: AssembledContext;
  executionOptions: ExecutionOptions;
  threadSettings: ThreadSettings | undefined;
  startTime: number;
  userPrompt: string;
  reRouteAttempt: number;
  reRouteReasons: string[];
};

/**
 * What `execute` has settled before the first provider is dialled: the chain
 * of candidates, the options every one of them runs with, and the context the
 * models will see.
 */
export type PreparedExecution = {
  startTime: number;
  candidates: RunCandidateArgs['candidates'];
  userPrompt: string;
  executionOptions: ExecutionOptions;
  executionContext: AssembledContext;
  searchOutcome: SearchFirstOutcome | null;
};

/**
 * The running state of one pass down the candidate chain, so the loop body can
 * be split across small helpers instead of one function holding ten locals.
 */
export type CandidateChainState = {
  lastError: unknown;
  reRouteAttempt: number;
  reRouteReasons: string[];
  // Per-attempt observability for the developer drawer.
  attempts: AttemptRecord[];
  // A picked model's substitutes: how many were tried, and which providers
  // already failed as a WHOLE (down, out of credit, rate limited), so a second
  // model of the same provider is not dialled just to fail the same way.
  failedProviders: Set<string>;
  substituteAttempts: number;
  // AUTO: a credit refusal (free requests used up, balance empty) is about THAT
  // credit model only. Included and local models still work, so the chain moves
  // on; the first refusal is kept to explain a chain that ends empty.
  creditRefusedProviders: Set<string>;
  creditRefusal: unknown;
  // The credit model the user wanted, once one is refused, so an included model
  // that answers instead can say so (metadata.creditFallback).
  creditRefusalRecord: CreditRefusalRecord | null;
  // True once a refusal says the credit itself is gone (not just this prompt's price).
  creditGone: boolean;
};
