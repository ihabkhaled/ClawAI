// AI Route Plan — Phase 4 of the semantic router flagship.
// See docs/03-architecture/semantic-router-flagship-plan.md §7 of the
// flagship prompt.
//
// The planner takes the Phase 2 SemanticIntentAnalysis + the available
// model intelligence registry + policy + health + learned signals, and
// asks an Ollama router model to choose the best workflow + primary
// model + up to 2 fallback models. In Phase 4 the plan is stored on
// the routing_decisions row as shadow output — Phase 5 promotes it to
// the actual execution path for the fallback executor.

import type { RoutingMode } from '../../../generated/prisma';
import type {
  ModalityKind,
  RiskLevel,
  SemanticIntentAnalysis,
} from './semantic-intent-analysis.types';

export type AIRoutePlannerStatus =
  | 'SUCCESS'
  | 'INVALID_JSON_AFTER_RETRY'
  | 'OLLAMA_TIMEOUT'
  | 'OLLAMA_ERROR'
  | 'SKIPPED_FLAG_DISABLED'
  | 'SKIPPED_NO_ANALYSIS'
  | 'VALIDATION_FAILED';

// Minimal capability snapshot the planner sees for each candidate. The
// caller (RoutingService) builds this from whatever the model registry
// has — Phase 3 will fill in richer fields but the shape stays the same.
export type PlannerCandidate = {
  provider: string;
  model: string;
  displayName?: string;
  isAvailable: boolean;
  isRouterOnly: boolean;
  isExecutionModel: boolean;
  supportsTools?: boolean | null;
  supportsVision?: boolean | null;
  supportsLongContext?: boolean | null;
  qualityTier?: string | null;
  costClass?: string | null;
  latencyClass?: string | null;
  privacyClass?: string | null;
  domainStrengths?: string[];
  weakDomains?: string[];
};

export type AIRoutePlannerInput = {
  threadId: string;
  message: string;
  routingMode: RoutingMode;
  semanticIntent: SemanticIntentAnalysis | null;
  candidates: PlannerCandidate[];
  activePolicyName?: string;
  providerHealth?: Record<string, boolean>;
  budgetClass?: string;
};

export type AIRoutePlanFallback = {
  provider: string;
  model: string;
  workflow?: string;
  reason: string;
};

export type AIRoutePlanRejection = {
  provider: string;
  model: string;
  reason: string;
};

export type AIRoutePlan = {
  selectedWorkflow: string;
  selectedProvider: string;
  selectedModel: string;
  confidence: number;
  reasonTags: string[];
  routeReason: string;
  fallbackChain: AIRoutePlanFallback[];
  rejectedCandidates: AIRoutePlanRejection[];
  requiresJudge: boolean;
  requiresSearch: boolean;
  requiresExtraction: boolean;
  requiresCompare: boolean;
  estimatedCostClass: string;
  estimatedLatencyClass: string;
  estimatedRiskLevel: RiskLevel;
  modalityNeeds: ModalityKind[];
};

export type AIRoutePlanValidationIssue = {
  code: string;
  message: string;
  candidate?: { provider: string; model: string };
};

export type AIRoutePlanRecord = {
  status: AIRoutePlannerStatus;
  plan: AIRoutePlan | null;
  validationIssues: AIRoutePlanValidationIssue[];
  rawOutputExcerpt?: string;
  routerModel: string;
  attempts: number;
  durationMs: number;
  failureReason?: string;
};

// Shape returned by the Ollama /generate endpoint when stream=false.
// Kept here (not inline in the manager) for the routing-service ESLint
// rule that bans inline type aliases.
export type OllamaGeneratePlannerResponse = {
  response: string;
  done?: boolean;
};
