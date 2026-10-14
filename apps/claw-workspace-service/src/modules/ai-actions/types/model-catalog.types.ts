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
  maxContextTokens: number | null;
  usageTier: string | null;
  supportsStructuredOutput: boolean;
  supportsTools: boolean;
};

export type ResolvedModelCatalog = {
  installedLocalModels: InstalledLocalModel[];
  connectedProviders: ConnectedProvider[];
  refreshedAt: Date;
  /** False when either source could not be read; such a catalog is cached only briefly. */
  complete: boolean;
};

export type ResolveDefaultsInput = {
  preferLocal?: boolean;
  capabilityHints?: string[];
  /**
   * Whose plan filters the cloud models. Without it every exposed model is a
   * candidate, which is only right for callers that are not acting for a user.
   */
  userId?: string;
};

export type ResolvedDefaults = {
  primary: ModelChoice | null;
  fallbackChain: ModelChoice[];
};

export type ModelCatalogCache = {
  catalog: ResolvedModelCatalog;
  expiresAt: number;
};
