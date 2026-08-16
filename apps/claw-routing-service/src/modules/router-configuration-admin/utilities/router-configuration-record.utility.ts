import type { RouterChainEntry, RouterConfiguration } from '../../../generated/prisma';
import type {
  RouterConfigurationDetail,
  RouterConfigurationEntryRecord,
  RouterConfigurationSummary,
} from '../types/router-configuration-admin.types';

export function mapEntryRow(row: RouterChainEntry): RouterConfigurationEntryRecord {
  return {
    id: row.id,
    order: row.order,
    enabled: row.enabled,
    role: row.role,
    deploymentId: row.deploymentId,
    modelAlias: row.modelAlias,
    provider: row.provider,
    attemptTimeoutMs: row.attemptTimeoutMs,
    retries: row.retries,
    triggers: row.triggers,
    skipWhenProviderCircuitOpen: row.skipWhenProviderCircuitOpen,
    minConfidence: row.minConfidence === null ? null : Number(row.minConfidence),
    maxCostMicroUsd: row.maxCostMicroUsd === null ? null : row.maxCostMicroUsd.toString(),
    billingModel: row.billingModel,
    lastValidatedAt: row.lastValidatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapConfigurationSummary(
  row: RouterConfiguration & { entries: readonly RouterChainEntry[] },
): RouterConfigurationSummary {
  return {
    id: row.id,
    scope: row.scope,
    revision: row.revision,
    status: row.status,
    mode: row.mode,
    enabled: row.enabled,
    totalDeadlineMs: row.totalDeadlineMs,
    maxAttempts: row.maxAttempts,
    maxRouterInputTokens: row.maxRouterInputTokens,
    maxRouterOutputTokens: row.maxRouterOutputTokens,
    minConfidence: Number(row.minConfidence),
    lowConfidenceAction: row.lowConfidenceAction,
    failClosedWhenNoEligibleRouter: row.failClosedWhenNoEligibleRouter,
    skipProviderOnProviderWideFailure: row.skipProviderOnProviderWideFailure,
    safeTraceLevel: row.safeTraceLevel,
    legacyLocalRollbackEnabled: row.legacyLocalRollbackEnabled,
    supersedesRevision: row.supersedesRevision,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    entryCount: row.entries.length,
  };
}

export function mapConfigurationDetail(
  row: RouterConfiguration & { entries: readonly RouterChainEntry[] },
): RouterConfigurationDetail {
  const { entryCount: _entryCount, ...summary } = mapConfigurationSummary(row);
  return {
    ...summary,
    entries: [...row.entries].sort((a, b) => a.order - b.order).map((entry) => mapEntryRow(entry)),
  };
}
