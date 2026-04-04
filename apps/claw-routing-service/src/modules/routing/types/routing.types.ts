import {
  type RoutingDecision,
  type RoutingPolicy,
  type RoutingMode,
  type Prisma,
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
}

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

export type { RoutingDecision, RoutingPolicy, RoutingMode };
