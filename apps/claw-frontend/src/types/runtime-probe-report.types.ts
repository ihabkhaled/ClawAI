import type { RuntimeProbeExecutionProfile } from '@/enums/runtime-probe-execution-profile.enum';
import type { RuntimeProbeStatus } from '@/enums/runtime-probe-status.enum';
import type { RuntimeProvider } from '@/enums/runtime-provider.enum';

export type { RuntimeProbeExecutionProfile };

// Mirrors @claw/shared-types RuntimeProbeReport. Kept here so the frontend
// never has to depend on packages/shared-types directly. Sync with
// packages/shared-types/src/runtime-progress/runtime-probe-report.types.ts.

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
  executionProfile?: RuntimeProbeExecutionProfile;
  queueDepth?: number;
  slots?: RuntimeProbeSlot[];
  recentEvents?: RuntimeProbeRecentEvent[];
  capabilities?: RuntimeProbeCapabilities;
  errorType?: string;
  errorMessage?: string;
};
