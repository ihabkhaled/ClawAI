import type { UpdateRuntimeConfigPayload } from '@/types/local-frontier.types';

export interface UpdateRuntimeConfigArgs {
  modelId: string;
  payload: UpdateRuntimeConfigPayload;
}

export interface DeleteWeightsArgs {
  modelId: string;
  confirmName: string;
}

export interface InitiatePullArgs {
  modelId: string;
  overrideHardwareGate: boolean;
}
