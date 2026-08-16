import type { ExcludedChainEntry } from './router-chain-resolution.types';
import type { RouterCoordinatorResult } from './router-inference.types';

export interface CloudRouteRequest {
  traceId: string;
  /** Correlates the trace with the originating request; defaults to traceId. */
  requestId?: string;
  threadId?: string | null;
  /** The compact router prompt. Hard privacy filtering has already run. */
  prompt: string;
  /** Deployments the decision may select, post policy filtering. */
  eligibleDeploymentIds: readonly string[];
}

/**
 * The cloud router declined to decide. `reason` is a stable code so the caller
 * can distinguish "not turned on yet" from "configured but nothing can run",
 * which look identical from the outside and mean very different things.
 */
export interface CloudRouteUnavailable {
  available: false;
  reason: string;
  excluded?: readonly ExcludedChainEntry[];
}

export interface CloudRouteAvailable {
  available: true;
  /** Revision the decision was made against, recorded with the decision. */
  configurationRevision: number;
  excluded: readonly ExcludedChainEntry[];
  outcome: RouterCoordinatorResult;
}

export type CloudRouteResult = CloudRouteUnavailable | CloudRouteAvailable;
