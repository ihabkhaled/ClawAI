import {
  type Prisma,
  type ComplexityClass as PrismaComplexityClass,
  type RoutingDecision,
  type RoutingMode,
  type RoutingOutcomeRecord,
  type RoutingPolicy,
  type WorkflowKind,
} from '../../../generated/prisma';
import type { ComplexityClassification } from './complexity.types';
import type { RoutingExplanation } from './explanation.types';
import type { WorkflowAvailability } from '../../workflows/types/live-workflow-selector.types';

export interface RoutingContext {
  message: string;
  threadId?: string;
  threadHistory?: string[];
  memory?: string[];
  contextPacks?: string[];
  connectorHealth?: Record<string, boolean>;
  runtimeHealth?: Record<string, boolean>;
  providerLatencyMs?: Record<string, number>;
  providerCircuitOpenUntil?: Record<string, number>;
  localDegradeLatencyMs?: number;
  latencyPenaltyStepMs?: number;
  userMode?: RoutingMode;
  forcedModel?: string;
  forcedProvider?: string;
  complexity?: ComplexityClassification;
  /**
   * Set by the caller when this request will execute through the Runtime V2
   * agent lane and therefore needs a model that can emit native tool calls.
   *
   * Deliberately an explicit flag rather than a keyword heuristic. The other
   * capability signals are inferred from message text, which is already the
   * least reliable part of routing; whether a run is an agent run is something
   * the caller *knows*, so it should not be re-guessed from prose.
   */
  requiresToolCalling?: boolean;
  /**
   * V6 learning evolution (ADR-070) — opaque reference to claw-workspace-
   * service's Workspace. Optional and, today, always undefined: no current
   * caller populates it. When present, calibrateDecision consults a
   * workspace-tier learned prior as a bounded secondary signal on top of the
   * global RouterModelProfile calibration it already applies to every
   * decision — never a replacement for it, never a hard override.
   */
  workspaceId?: string;
  /**
   * Who sent the message this routing decision is for.
   *
   * Present for anything that reached routing through `message.created`, which
   * carries it. It exists so the cloud router can meter its OWN paid inference
   * (U5/U6) against that user's PAYG credit — routing calls real billed models
   * to decide where a message goes, and that spend previously stopped at
   * `router_attempts`.
   *
   * Optional and never inferred. A path with no user genuinely has none, and
   * charging an invented id would be worse than an unmetered internal call.
   */
  userId?: string;
}

export interface RoutingDecisionResult {
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  confidence: number;
  reasonTags: string[];
  privacyClass: string;
  costClass: string;
  fallbackChain: FallbackEntry[];
  detectedCategory?: string;
  secondaryCategory?: string;
  matchCount?: number;
  estimatedCostPer1M?: number;
  latencySlaMs?: number;
  complexityClass?: ComplexityClassification['class'];
  selectedExecutionPath?: string;
  capabilityMatchScore?: number;
  latencyScore?: number;
  riskScore?: number;
  uncertaintyScore?: number;
  explanation?: RoutingExplanation;
  routingDurationMs?: number;
  routerModel?: string | null;
  // Phase 6 — workflow live wiring. Optional/null preserves the v1 hot
  // path: existing consumers that don't read this field keep working.
  selectedWorkflow?: WorkflowKind | null;
  workflowReason?: string | null;
  workflowAlternatives?: WorkflowAvailability[];
}

export type MultiIntentResult = {
  primary: string;
  secondary: string | null;
  confidence: number;
  matchCount: number;
};

export interface FallbackEntry {
  provider: string;
  model: string;
}

export interface PolicyEvaluationInput {
  context: RoutingContext;
  policies: RoutingPolicy[];
}

export interface PolicyEvaluationResult {
  selectedPolicy: RoutingPolicy | null;
  decision: RoutingDecisionResult;
}

export interface CreatePolicyData {
  name: string;
  routingMode: RoutingMode;
  priority: number;
  config: Prisma.InputJsonValue;
  isActive?: boolean;
}

export interface UpdatePolicyData {
  name?: string;
  routingMode?: RoutingMode;
  priority?: number;
  config?: Prisma.InputJsonValue;
  isActive?: boolean;
}

export interface PolicyFilters {
  routingMode?: RoutingMode;
  isActive?: boolean;
}

export interface CreateDecisionData {
  messageId?: string;
  threadId: string;
  messageContent?: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  confidence?: number;
  reasonTags: string[];
  privacyClass?: string;
  costClass?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  complexityClass?: PrismaComplexityClass;
  detectedCategory?: string;
  secondaryCategory?: string;
  matchCount?: number;
  selectedExecutionPath?: string;
  routeRoadmap?: Prisma.InputJsonValue;
  modelInventorySnapshot?: Prisma.InputJsonValue;
  connectorHealthSnapshot?: Prisma.InputJsonValue;
  capabilityMatchScore?: number;
  latencyScore?: number;
  riskScore?: number;
  uncertaintyScore?: number;
  explanation?: Prisma.InputJsonValue;
  routingDurationMs?: number;
  // Phase 6 — workflow live wiring. Nullable; v1 hot path unaffected.
  selectedWorkflow?: WorkflowKind | null;
  workflowReason?: string | null;
}

export type OllamaGenerateResponse = {
  response: string;
  model: string;
  done: boolean;
};

export type OllamaRouterDecision = {
  provider: string;
  model: string;
  confidence: number;
  reason: string;
  routerModel?: string;
};

export interface RouterDecisionSnapshot {
  provider: string;
  model: string;
  reason: string;
}

export interface HeuristicState {
  localHealthy: boolean;
  messageLength: number;
  complexity: ComplexityClassification | undefined;
  canPreferGenericLocal: boolean;
  cloudPriority: FallbackEntry[];
  bestAvailable: FallbackEntry | null;
  localLikelySlow: boolean;
}

export type ModeHandler = (
  ctx: RoutingContext,
) => Promise<RoutingDecisionResult> | RoutingDecisionResult;

/**
 * A `RoutingDecision` with its (at most one, per the unique constraint)
 * `RoutingOutcomeRecord` included — used by shadow/replay evaluation to read
 * the legacy judge/critic signal without a second round trip.
 */
export type RoutingDecisionWithOutcomes = RoutingDecision & { outcomes: RoutingOutcomeRecord[] };

export type { RoutingDecision, RoutingPolicy, RoutingMode };
export type { ComplexityClassification } from './complexity.types';
export type { RoutingExplanation, ExplanationFactor, RejectedEntry } from './explanation.types';
