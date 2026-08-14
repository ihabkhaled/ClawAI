import type { RouterProvider } from '../../../generated/prisma';

/** A deployment considered when resolving a chain alias. */
export interface AliasMatchCandidate {
  deploymentId: string;
  provider: RouterProvider;
  providerModelId: string;
}

/** One model as connector-service reports it. */
export interface DiscoveredModel {
  provider: string;
  modelKey: string;
  displayName: string;
  family?: string;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
}

export interface DiscoveryImportResult {
  definitionsCreated: number;
  deploymentsCreated: number;
  skipped: number;
}

export interface AliasResolutionResult {
  resolved: number;
  unresolved: readonly UnresolvedAlias[];
}

export interface UnresolvedAlias {
  entryId: string;
  order: number;
  provider: RouterProvider;
  alias: string;
}
