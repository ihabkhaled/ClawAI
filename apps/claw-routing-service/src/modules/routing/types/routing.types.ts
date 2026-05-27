import {
  type Prisma,
  type ComplexityClass as PrismaComplexityClass,
  type RoutingDecision,
  type RoutingMode,
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

export type { RoutingDecision, RoutingPolicy, RoutingMode };
export type { ComplexityClassification } from './complexity.types';
export type { RoutingExplanation, ExplanationFactor, RejectedEntry } from './explanation.types';
