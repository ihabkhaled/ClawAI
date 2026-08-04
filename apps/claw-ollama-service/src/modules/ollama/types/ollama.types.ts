import {
  type LocalModel,
  type LocalModelRole,
  type LocalModelRoleAssignment,
  type ModelCategory,
  type PullJob,
  type PullJobPhase,
  type PullJobStatus,
  type RuntimeType,
} from '../../../generated/prisma';
import type { ChatRequest, ChatResponse } from './ollama-chat.types';

export interface RuntimeAdapter {
  listModels(): Promise<LocalModelInfo[]>;
  pullModel(name: string): Promise<PullJobInfo>;
  healthCheck(): Promise<RuntimeHealth>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  // Optional on purpose: a chat surface with native tool support is not
  // universal across runtimes (ComfyUI has no chat at all). Callers must check
  // for it rather than assume it, so an unsupported runtime fails with a clear
  // message instead of a TypeError.
  chat?(request: ChatRequest): Promise<ChatResponse>;
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
  think?: boolean;
  options?: Record<string, unknown>;
  images?: string[];
  keepAlive?: string;
}

export interface GenerateResponse {
  model: string;
  createdAt: string;
  response: string;
  thinking?: string;
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
  category?: ModelCategory | null;
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
  phase?: PullJobPhase;
  totalBytes?: bigint | null;
  downloadedBytes?: bigint | null;
}

export interface UpdatePullJobData {
  status?: PullJobStatus;
  phase?: PullJobPhase;
  progress?: number | null;
  totalBytes?: bigint | null;
  downloadedBytes?: bigint | null;
  installStep?: string | null;
  errorMessage?: string | null;
  completedAt?: Date | null;
  lastProgressAt?: Date | null;
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

export type InstalledModelDedupRef = {
  name: string;
  tag: string;
};

export type CatalogEntryDedupRef = {
  name: string;
  tag: string;
  ollamaName: string | null;
};

export type {
  LocalModel,
  LocalModelRoleAssignment,
  ModelCategory,
  PullJob,
  RuntimeType,
  LocalModelRole,
  PullJobStatus,
  PullJobPhase,
};
