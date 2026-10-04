import type { ModelAvailabilityStatus } from '../enums/model-availability-status.enum';
import type { ModelCapability } from '../enums/model-capability.enum';
import type { ModelRuntime } from '../enums/model-runtime.enum';

export type AvailableModelOption = {
  provider: string;
  runtime: ModelRuntime;
  connectorId?: string;
  model: string;
  displayName: string;
  capabilities: ModelCapability[];
  availabilityStatus: ModelAvailabilityStatus;
  healthStatus?: string;
  supportsStreaming: boolean;
  supportsJsonOutput: boolean;
  supportsTokenUsage: boolean;
  canJudge: boolean;
  isLocal: boolean;
  disabledReasonMessageKey?: string;
};
