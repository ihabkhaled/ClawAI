import {
  type Prisma,
  type RoutingDecision,
  type RoutingMode,
  type RoutingPolicy,
} from "../../../generated/prisma";

export interface RoutingContext {
  message: string;
  threadId?: string;
  threadHistory?: string[];
  memory?: string[];
  contextPacks?: string[];
  connectorHealth?: Record<string, boolean>;
  runtimeHealth?: Record<string, boolean>;
  userMode?: RoutingMode;
  forcedModel?: string;
  forcedProvider?: string;
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
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  confidence?: number;
  reasonTags: string[];
  privacyClass?: string;
  costClass?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
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
};

export type { RoutingDecision, RoutingPolicy, RoutingMode };
