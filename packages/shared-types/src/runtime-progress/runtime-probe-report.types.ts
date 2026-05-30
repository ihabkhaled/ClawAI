import { type RuntimeExecutionProfile } from './runtime-execution-profile.enum';
import { type RuntimeProbeStatus } from './runtime-probe-status.enum';
import { type RuntimeProvider } from './runtime-provider.enum';
import { type StreamingErrorType } from './streaming-error-type.enum';

export type RuntimeProbeModel = {
  id: string;
  family?: string;
  sizeBytes?: number;
  quantization?: string;
  capabilities?: string[];
};

export type RuntimeProbeSlot = {
  index: number;
  modelId?: string;
  busy: boolean;
};

export type RuntimeProbeRecentEvent = {
  atMs: number;
  type: string;
  modelId?: string;
  durationMs?: number;
  status?: string;
  message?: string;
};

export type RuntimeProbeCapabilities = {
  streamingText: boolean;
  thinking: boolean;
  promptProgress: boolean;
  nodeProgress: boolean;
  stepProgress: boolean;
  cancel: boolean;
  metrics: boolean;
};

export type RuntimeProbeReport = {
  provider: RuntimeProvider;
  runtimeUrl: string;
  status: RuntimeProbeStatus;
  probedAtMs: number;
  latencyMs?: number;
  version?: string;
  models?: RuntimeProbeModel[];
  activeModelId?: string;
  executionProfile?: RuntimeExecutionProfile;
  queueDepth?: number;
  slots?: RuntimeProbeSlot[];
  recentEvents?: RuntimeProbeRecentEvent[];
  capabilities?: RuntimeProbeCapabilities;
  errorType?: StreamingErrorType;
  errorMessage?: string;
};
