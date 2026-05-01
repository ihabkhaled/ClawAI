import type { ModelChoice } from './ai-action.types';

export type InstalledLocalModel = {
  id: string;
  name: string;
  tag: string;
  category: string | null;
  roles: string[];
  capabilities: string[];
  parameterCount: string | null;
};

export type InstalledLocalModelsResponse = {
  models: InstalledLocalModel[];
};

export type ConnectedProvider = {
  provider: string;
  models: ConnectedProviderModel[];
};

export type ConnectedProviderModel = {
  modelKey: string;
  displayName: string;
  capabilities: string[];
};

export type ResolvedModelCatalog = {
  installedLocalModels: InstalledLocalModel[];
  connectedProviders: ConnectedProvider[];
  refreshedAt: Date;
};

export type ResolveDefaultsInput = {
  preferLocal?: boolean;
  capabilityHints?: string[];
};

export type ResolvedDefaults = {
  primary: ModelChoice | null;
  fallbackChain: ModelChoice[];
};

export type ModelCatalogCache = {
  catalog: ResolvedModelCatalog;
  expiresAt: number;
};
