import type { RoutingMode } from "@/enums";

export type RoutingConfig = {
  id: string;
  mode: RoutingMode;
  defaultModel: string | null;
  fallbackModel: string | null;
  maxRetries: number;
  timeoutMs: number;
  updatedAt: string;
};

export type UpdateRoutingRequest = {
  mode: RoutingMode;
  defaultModel?: string;
  fallbackModel?: string;
  maxRetries?: number;
  timeoutMs?: number;
};

export type RoutingPolicy = {
  id: string;
  name: string;
  routingMode: RoutingMode;
  priority: number;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RoutingDecision = {
  id: string;
  messageId: string | null;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  confidence: number | null;
  reasonTags: string[];
  privacyClass: string | null;
  costClass: string | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  createdAt: string;
};

export type LocalModel = {
  id: string;
  name: string;
  tag: string;
  runtime: string;
  sizeBytes: number | null;
  family: string | null;
  parameters: string | null;
  isInstalled: boolean;
  roles: { role: string; isActive: boolean }[];
};

export type CreatePolicyRequest = {
  name: string;
  routingMode: RoutingMode;
  priority: number;
  isActive: boolean;
  config: Record<string, unknown>;
};

export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;

export type PullModelRequest = { modelName: string; runtime: string };
export type AssignRoleRequest = { modelId: string; role: string };

export type PoliciesListResponse = {
  data: RoutingPolicy[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type DecisionsListResponse = {
  data: RoutingDecision[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type LocalModelsListResponse = {
  data: LocalModel[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type RuntimesListResponse = string[];

export type RuntimeHealthResponse = {
  status: string;
  runtime: string;
  latencyMs: number;
};

export type EvaluateRouteRequest = {
  threadId: string;
  content: string;
};

export type EvaluateRouteResponse = {
  provider: string;
  model: string;
  routingMode: RoutingMode;
  confidence: number | null;
  reasonTags: string[];
};
