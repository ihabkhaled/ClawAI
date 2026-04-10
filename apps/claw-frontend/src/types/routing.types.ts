import type { RoutingMode } from '@/enums';

import type { FormFieldErrors } from './component.types';

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

export type UpdatePolicyParams = {
  id: string;
  data: UpdatePolicyRequest;
};

export type PolicyFormStateParams = {
  open: boolean;
  policy?: RoutingPolicy | null;
  onSubmit: (data: CreatePolicyRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type PolicyFormStateReturn = {
  name: string;
  setName: (value: string) => void;
  routingMode: RoutingMode;
  setRoutingMode: (value: RoutingMode) => void;
  priority: number;
  setPriority: (value: number) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  fieldErrors: FormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  handleSubmit: (e: React.FormEvent) => void;
};
