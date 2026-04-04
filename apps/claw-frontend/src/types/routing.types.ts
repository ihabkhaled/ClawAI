import type { RoutingMode } from "@/enums";

export interface RoutingConfig {
  id: string;
  mode: RoutingMode;
  defaultModel: string | null;
  fallbackModel: string | null;
  maxRetries: number;
  timeoutMs: number;
  updatedAt: string;
}

export interface UpdateRoutingRequest {
  mode: RoutingMode;
  defaultModel?: string;
  fallbackModel?: string;
  maxRetries?: number;
  timeoutMs?: number;
}
