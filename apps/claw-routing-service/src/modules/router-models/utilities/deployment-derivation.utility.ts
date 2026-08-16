import {
  DeploymentType,
  type DeploymentType as DeploymentTypeValue,
} from '../../../generated/prisma';
import { recordGet } from '../../../common/utilities';
import {
  DEPLOYMENT_KEY_FALLBACK_SCOPE,
  DEPLOYMENT_KEY_SEPARATOR,
  DEPLOYMENT_SEED_METADATA_SOURCE,
  PROVIDER_DEFAULT_DEPLOYMENT_TYPE,
  REGISTRY_PROVIDER_TO_ROUTER_PROVIDER,
} from '../constants/deployment-seed.constants';
import type {
  DeploymentDerivationResult,
  DeploymentSeedSourceRow,
  DerivedDeployment,
  SkippedDefinition,
} from '../types/deployment-seed.types';

/**
 * Composes the stable identity for one endpoint.
 *
 * `connectorId` and `runtimeId` are both nullable, and Postgres treats NULLs as
 * distinct, so a composite unique across them would admit duplicates. The scope
 * segment collapses that ambiguity into one comparable string.
 */
export function buildDeploymentKey(
  provider: string,
  providerModelId: string,
  connectorId: string | null,
  runtimeId: string | null,
): string {
  const scope = connectorId ?? runtimeId ?? DEPLOYMENT_KEY_FALLBACK_SCOPE;
  return [provider, providerModelId, scope].join(DEPLOYMENT_KEY_SEPARATOR);
}

/**
 * Chooses how an endpoint is reached.
 *
 * `isLocal` on the definition wins over the provider default, because an OLLAMA
 * row flagged non-local is reaching something that is not the local runtime and
 * must not be reported as LOCAL.
 */
function resolveDeploymentType(provider: string, isLocal: boolean): DeploymentTypeValue {
  if (!isLocal) {
    return DeploymentType.CLOUD_API;
  }
  return (
    recordGet(
      PROVIDER_DEFAULT_DEPLOYMENT_TYPE as Readonly<Record<string, DeploymentTypeValue>>,
      provider,
    ) ?? DeploymentType.LOCAL
  );
}

/**
 * Derives one deployment per registry definition.
 *
 * A definition whose provider string has no canonical mapping is skipped with a
 * reason rather than guessed at: an unrecognised provider that became a
 * deployment would be a routable endpoint nobody verified.
 */
export function deriveDeployments(
  rows: readonly DeploymentSeedSourceRow[],
): DeploymentDerivationResult {
  const deployments: DerivedDeployment[] = [];
  const skipped: SkippedDefinition[] = [];

  for (const row of rows) {
    const provider = recordGet(REGISTRY_PROVIDER_TO_ROUTER_PROVIDER, row.provider.toUpperCase());
    if (!provider) {
      skipped.push({ definitionId: row.id, provider: row.provider, reason: 'UNMAPPED_PROVIDER' });
      continue;
    }

    if (row.modelKey.trim().length === 0) {
      skipped.push({ definitionId: row.id, provider: row.provider, reason: 'EMPTY_MODEL_KEY' });
      continue;
    }

    deployments.push({
      definitionId: row.id,
      deploymentKey: buildDeploymentKey(provider, row.modelKey, row.connectorId, row.runtimeId),
      provider,
      providerModelId: row.modelKey,
      connectorId: row.connectorId,
      runtimeId: row.runtimeId,
      deploymentType: resolveDeploymentType(provider, row.isLocal),
      privacyClass: row.privacySupport,
      contextWindowTokens: row.contextWindowTokens,
      maxOutputTokens: row.maxOutputTokens,
      supportsTools: row.supportsTools,
      supportsStructuredOutput: row.supportsStructuredOutput,
      supportsStreaming: row.supportsStreaming,
      supportsVision: row.supportsVision,
      metadataSource: DEPLOYMENT_SEED_METADATA_SOURCE,
    });
  }

  return { deployments, skipped };
}
