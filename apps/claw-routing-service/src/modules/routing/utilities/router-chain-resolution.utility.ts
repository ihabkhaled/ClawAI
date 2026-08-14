import {
  DeploymentActivationState,
  RouterChainEntryRole,
  type RouterProvider,
} from '../../../generated/prisma';
import type {
  ChainResolution,
  ExcludedChainEntry,
  ResolvedChainEntry,
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../types/router-chain-resolution.types';

/**
 * Decides which entries of a snapshot can actually run.
 *
 * Every exclusion is recorded with a reason rather than silently dropped: an
 * operator looking at a chain that produced no decision needs to see that four
 * of six entries were unresolved aliases, not an empty list.
 *
 * A seeded entry has an alias but no deployment until discovery matches it, so
 * DEPLOYMENT_UNRESOLVED is the expected state of a freshly seeded chain — not an
 * error, and specifically not something to guess past.
 *
 * Quality-escalation entries are excluded from the ordinary walk. They answer
 * low confidence, which is a different condition from provider failure, and
 * letting one be reached by ordinary fallback would spend the escalation
 * model's budget on failures it was never meant to handle.
 */
export function resolveChain(
  snapshot: RouterConfigurationSnapshot,
  availableProviders: ReadonlySet<RouterProvider>,
): ChainResolution {
  const runnable: ResolvedChainEntry[] = [];
  const excluded: ExcludedChainEntry[] = [];

  const ordered = [...snapshot.entries].sort((left, right) => left.order - right.order);

  for (const entry of ordered) {
    const exclusion = excludeReason(entry, availableProviders);
    if (exclusion) {
      excluded.push({
        entryId: entry.entryId,
        order: entry.order,
        provider: entry.provider,
        modelAlias: entry.modelAlias,
        reason: exclusion,
      });
      continue;
    }

    runnable.push({
      entryId: entry.entryId,
      order: entry.order,
      provider: entry.provider,
      // Non-null by construction: excludeReason rejects an unresolved entry.
      providerModelId: entry.deploymentProviderModelId ?? entry.modelAlias,
      deploymentId: entry.deploymentId ?? '',
      attemptTimeoutMs: entry.attemptTimeoutMs,
      retries: entry.retries,
      triggers: entry.triggers,
    });
  }

  return { runnable, excluded };
}

function excludeReason(
  entry: SnapshotChainEntry,
  availableProviders: ReadonlySet<RouterProvider>,
): ExcludedChainEntry['reason'] | null {
  if (!entry.enabled) {
    return 'ENTRY_DISABLED';
  }
  if (entry.role === RouterChainEntryRole.QUALITY_ESCALATION) {
    return 'ESCALATION_ONLY';
  }
  if (!entry.deploymentId || !entry.deploymentProviderModelId) {
    return 'DEPLOYMENT_UNRESOLVED';
  }
  if (entry.deploymentActivationState !== DeploymentActivationState.ACTIVE) {
    return 'DEPLOYMENT_NOT_ACTIVE';
  }
  if (!availableProviders.has(entry.provider)) {
    return 'NO_ADAPTER_FOR_PROVIDER';
  }
  return null;
}

/**
 * The escalation entry, if the snapshot has a runnable one.
 *
 * Separated from the main walk because escalation is triggered by a confidence
 * verdict rather than by chain position.
 */
export function resolveEscalationEntry(
  snapshot: RouterConfigurationSnapshot,
  availableProviders: ReadonlySet<RouterProvider>,
): ResolvedChainEntry | null {
  const candidate = snapshot.entries.find(
    (entry) =>
      entry.role === RouterChainEntryRole.QUALITY_ESCALATION &&
      entry.enabled &&
      entry.deploymentId !== null &&
      entry.deploymentProviderModelId !== null &&
      entry.deploymentActivationState === DeploymentActivationState.ACTIVE &&
      availableProviders.has(entry.provider),
  );

  if (!candidate?.deploymentId || !candidate.deploymentProviderModelId) {
    return null;
  }

  return {
    entryId: candidate.entryId,
    order: candidate.order,
    provider: candidate.provider,
    providerModelId: candidate.deploymentProviderModelId,
    deploymentId: candidate.deploymentId,
    attemptTimeoutMs: candidate.attemptTimeoutMs,
    retries: candidate.retries,
    triggers: candidate.triggers,
  };
}

/**
 * Whether the snapshot can serve a request at all.
 *
 * A configuration that is disabled, or has no runnable entry, must produce a
 * typed refusal rather than an arbitrary model choice — an unexplained
 * selection is worse than an honest failure.
 */
export function isChainServiceable(
  snapshot: RouterConfigurationSnapshot,
  resolution: ChainResolution,
): boolean {
  return snapshot.enabled && resolution.runnable.length > 0;
}
