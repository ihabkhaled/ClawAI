import type { DeploymentType, PrivacyClass, RouterProvider } from '../../../generated/prisma';

/// The subset of a registry definition the backfill needs to derive an endpoint.
export interface DeploymentSeedSourceRow {
  id: string;
  provider: string;
  modelKey: string;
  connectorId: string | null;
  runtimeId: string | null;
  isLocal: boolean;
  privacySupport: PrivacyClass;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  supportsTools: boolean | null;
  supportsStructuredOutput: boolean | null;
  supportsStreaming: boolean | null;
  supportsVision: boolean | null;
}

/// A derived deployment, ready to upsert. activationState is deliberately absent
/// — the column defaults to REQUIRES_VALIDATION and the backfill must never
/// promote a row it has not validated.
export interface DerivedDeployment {
  definitionId: string;
  deploymentKey: string;
  provider: RouterProvider;
  providerModelId: string;
  connectorId: string | null;
  runtimeId: string | null;
  deploymentType: DeploymentType;
  privacyClass: PrivacyClass;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  supportsTools: boolean | null;
  supportsStructuredOutput: boolean | null;
  supportsStreaming: boolean | null;
  supportsVision: boolean | null;
  metadataSource: string;
}

/// Rows the backfill refused to derive, kept so the caller can log a count and
/// a reason instead of silently dropping definitions.
export interface SkippedDefinition {
  definitionId: string;
  provider: string;
  reason: string;
}

export interface DeploymentDerivationResult {
  deployments: DerivedDeployment[];
  skipped: SkippedDefinition[];
}

export interface SeedApplyInput {
  name: string;
  version: number;
  checksum: string;
  deployments: DerivedDeployment[];
}
