import type { ConnectorProvider } from '../enums/connector-provider.enum';
import type { ModelAvailabilityStatus } from '../enums/model-availability-status.enum';
import type { ModelCapability } from '../enums/model-capability.enum';
import type { ModelRuntime } from '../enums/model-runtime.enum';

export type AvailableModelOption = {
  provider: ConnectorProvider;
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
