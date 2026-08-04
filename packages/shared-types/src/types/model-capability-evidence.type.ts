import type { CapabilityConfidence } from '../enums/capability-confidence.enum';
import type { CapabilityEvidenceSource } from '../enums/capability-evidence-source.enum';

/**
 * Model capability evidence registry — the record behind
 * "never route Agent work from a hard-coded model-name guess".
 *
 * A bare `supportsTools: boolean` cannot answer the question routing actually
 * needs to ask, which is not "does this model have tools" but "how do we know,
 * and is that good enough to stake an agent run on". These records carry the
 * claim, its source, its confidence, and its expiry so that a curated-list
 * guess and a successful behavioral probe are never mistaken for each other.
 */

/** Result of one deterministic behavioral probe against a specific model. */
export type ModelBehaviorProbeResult = {
  /** Stable probe identifier, e.g. `native-tool-call`, `tool-result-continuation`. */
  probeId: string;
  passed: boolean;
  checkedAt: string;
  durationMs?: number;
  /** Stable failure code when `passed` is false — never a raw provider body. */
  failureCode?: string;
};

export type ModelCapabilityFlags = {
  tools: boolean;
  streamingTools: boolean;
  parallelReadOnlyTools: boolean;
  vision: boolean;
  structuredOutput: boolean;
  thinking: boolean;
  /** Effort values this exact model actually accepts. Empty = none proven. */
  effortValues: string[];
  /** Speed/latency tiers this exact model actually accepts. */
  speedValues: string[];
  /** What the provider claims the context window is. */
  contextAdvertised?: number;
  /**
   * What the serving stack actually allocated. Can be far below the advertised
   * number on a local runtime, which is the difference between a run that fits
   * and one that silently truncates.
   */
  contextAllocated?: number;
  maxOutputTokens?: number;
  /** Whether the provider preserves reasoning across turns of a tool loop. */
  preservedReasoningHistory: boolean;
  /** Whether host-executed research tools work against this model. */
  researchHostCompatible: boolean;
};

export type ModelCapabilityEvidence = {
  evidenceId: string;
  provider: string;
  /**
   * Hash of the connection identity (base URL + credential identity), NOT the
   * credential. Evidence is only valid for the endpoint that produced it: the
   * same model name behind a different server or account can behave
   * differently, so a cache keyed on model name alone would leak conclusions
   * across connections.
   */
  connectionIdentityHash: `sha256:${string}`;
  model: string;
  /** Exact digest where the runtime exposes one; a tag can be repointed. */
  modelDigest?: string;
  providerVersion?: string;
  source: CapabilityEvidenceSource;
  checkedAt: string;
  /** After this, the record is stale and must be re-established. */
  expiresAt: string;
  confidence: CapabilityConfidence;
  capabilities: ModelCapabilityFlags;
  probeResults: ModelBehaviorProbeResult[];
  lastFailureCode?: string;
};

/**
 * Cache key components. Any change to one of these invalidates the record:
 * a server upgrade, a re-pulled digest, or an endpoint switch can all change
 * behaviour while the model name stays identical.
 */
export type ModelCapabilityCacheKey = {
  connectionIdentityHash: string;
  provider: string;
  providerVersion?: string;
  model: string;
  modelDigest?: string;
};
