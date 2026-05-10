import type { AssembledContext } from './context.types';
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
