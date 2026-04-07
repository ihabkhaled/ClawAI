import { type LocalModel, type LocalModelRole, type LocalModelRoleAssignment, type PullJob, type PullJobStatus, type RuntimeType } from "../../../generated/prisma";

export interface RuntimeAdapter {
  listModels(): Promise<LocalModelInfo[]>;
  pullModel(name: string): Promise<PullJobInfo>;
  healthCheck(): Promise<RuntimeHealth>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface LocalModelInfo {
  name: string;
  tag: string;
  sizeBytes: bigint | null;
  family: string | null;
  parameters: string | null;
  quantization: string | null;
}

export interface PullJobInfo {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
}

export interface GenerateResponse {
  model: string;
  createdAt: string;
  response: string;
  done: boolean;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
}

export interface RuntimeHealth {
  runtime: string;
  healthy: boolean;
  latencyMs: number;
  errorMessage?: string;
}

export interface CreateLocalModelData {
  name: string;
  tag: string;
  runtime: RuntimeType;
  sizeBytes?: bigint | null;
  family?: string | null;
  parameters?: string | null;
  quantization?: string | null;
  isInstalled?: boolean;
}

export interface LocalModelFilters {
  runtime?: RuntimeType;
  isInstalled?: boolean;
}

export interface CreatePullJobData {
  modelName: string;
  runtime: RuntimeType;
  status?: PullJobStatus;
}

export interface UpdatePullJobData {
  status?: PullJobStatus;
  progress?: number | null;
  errorMessage?: string | null;
  completedAt?: Date | null;
}

export interface CreateRoleAssignmentData {
  modelId: string;
  role: LocalModelRole;
  isActive?: boolean;
}

export interface CreateRuntimeConfigData {
  runtime: RuntimeType;
  baseUrl: string;
  isEnabled?: boolean;
}

export interface UpdateRuntimeConfigData {
  baseUrl?: string;
  isEnabled?: boolean;
}

export type { LocalModel, LocalModelRoleAssignment, PullJob, RuntimeType, LocalModelRole, PullJobStatus };
