// Phase 8 UI transparency — frontend type for the routing decision
// detail drawer. Mirrors the Prisma RoutingDecision row plus the
// asynchronously-patched semanticAnalysis JSON column.

import type { ComplexityClass, RoutingMode } from '@/enums';

import type { RoutingExplanation } from './routing.types';
import type { SemanticIntentAnalysisRecord } from './semantic-analysis.types';

export type RoutingDecisionFallbackEntry = {
  provider: string;
  model: string;
};

export type RoutingDecisionRouteRoadmap = {
  selectedProvider?: string;
  selectedModel?: string;
  fallbackChain?: RoutingDecisionFallbackEntry[];
  detectedCategory?: string | null;
  secondaryCategory?: string | null;
  steps?: Array<{
    stage?: string;
    provider?: string;
    model?: string;
    displayName?: string | null;
    description?: string | null;
  }>;
};

export type RoutingDecisionConnectorHealthSnapshot = {
  connectorHealth?: Record<string, boolean>;
  runtimeHealth?: Record<string, boolean>;
  providerLatencyMs?: Record<string, number>;
  providerCircuitOpenUntil?: Record<string, number>;
};

export type RoutingDecisionDetail = {
  id: string;
  messageId: string | null;
  threadId: string;
  messageContent: string | null;
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  confidence: number | null;
  reasonTags: string[];
  privacyClass: string | null;
  costClass: string | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  complexityClass: ComplexityClass | null;
  detectedCategory: string | null;
  secondaryCategory: string | null;
  matchCount: number | null;
  selectedExecutionPath: string | null;
  routeRoadmap: RoutingDecisionRouteRoadmap | null;
  modelInventorySnapshot: unknown;
  connectorHealthSnapshot: RoutingDecisionConnectorHealthSnapshot | null;
  capabilityMatchScore: number | null;
  latencyScore: number | null;
  riskScore: number | null;
  uncertaintyScore: number | null;
  explanation: RoutingExplanation | null;
  routingDurationMs: number | null;
  semanticAnalysis: SemanticIntentAnalysisRecord | null;
  createdAt: string;
};
