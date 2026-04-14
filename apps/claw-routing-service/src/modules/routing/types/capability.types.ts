import type { ModelCapability } from '../../../common/enums/model-capability.enum';

export type ProviderCapabilityEntry = {
  provider: string;
  model: string;
  capabilities: ModelCapability[];
};

export type CapabilityRoutingResult = {
  provider: string;
  model: string;
  capability: ModelCapability;
  reason: string;
};
