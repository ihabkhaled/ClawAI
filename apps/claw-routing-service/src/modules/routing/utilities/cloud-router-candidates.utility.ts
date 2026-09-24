import { modelMatchKey } from '@claw/shared-utilities';
import { DeploymentActivationState } from '../../../generated/prisma';
import type {
  CloudRouterCandidateFilter,
  EligibleDeploymentRecord,
  RoutableDeploymentRecord,
} from '../types/model-deployment.types';

// One spelling per model, so catalog, deployment and plan keys compare equal.
// The normalizer lives in @claw/shared-utilities because chat-service's
// capability lookup must key the connector snapshot exactly the same way
// (rule 42 item 13); re-exported so existing importers stay untouched.
export { modelMatchKey };

/**
 * The AUTO router's candidates: exposed by an admin, on a healthy connector,
 * allowed by the user's plan; proven (ACTIVE) models first, then one model per
 * provider in turn so no single provider fills the list.
 *
 * With no exposure snapshot (connector-service unreachable) it falls back to
 * ACTIVE-only, the previous behaviour, rather than offering every model.
 */
export function selectCloudRouterCandidates(
  deployments: readonly RoutableDeploymentRecord[],
  filter: CloudRouterCandidateFilter,
): EligibleDeploymentRecord[] {
  const fit = deployments.filter((deployment) => isFit(deployment, filter));

  const byProvider = new Map<string, RoutableDeploymentRecord[]>();
  for (const deployment of fit) {
    const list = byProvider.get(deployment.provider) ?? [];
    list.push(deployment);
    byProvider.set(deployment.provider, list);
  }
  for (const list of byProvider.values()) {
    list.sort((a, b) => rank(a) - rank(b) || a.providerModelId.localeCompare(b.providerModelId));
  }

  const picked: EligibleDeploymentRecord[] = [];
  const queues = [...byProvider.values()];
  while (picked.length < filter.max && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && picked.length < filter.max) {
        picked.push({
          id: next.id,
          provider: next.provider,
          providerModelId: next.providerModelId,
        });
      }
    }
  }
  return picked;
}

function isFit(deployment: RoutableDeploymentRecord, filter: CloudRouterCandidateFilter): boolean {
  const key = modelMatchKey(deployment.provider, deployment.providerModelId);
  const exposedOk =
    filter.exposed === null
      ? deployment.activationState === DeploymentActivationState.ACTIVE
      : filter.exposed.has(key);
  const healthy = filter.connectorHealth[deployment.provider] !== false;
  const allowed = filter.allowed === null || filter.allowed.has(key);
  return exposedOk && healthy && allowed;
}

function rank(deployment: RoutableDeploymentRecord): number {
  return deployment.activationState === DeploymentActivationState.ACTIVE ? 0 : 1;
}
