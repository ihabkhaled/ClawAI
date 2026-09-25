import { modelMatchKey } from '@claw/shared-utilities';
import { ModalityFit } from '../../../common/enums/modality-fit.enum';
import { DeploymentActivationState } from '../../../generated/prisma';
import { modalityFitOf, modalityFitRank } from './modality-fit.utility';
import type {
  CloudRouterCandidateFilter,
  EligibleDeploymentRecord,
  RankedDeploymentRecord,
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
 *
 * Multimodal batch 8 (rule 51 item 13): when the turn carries attachments,
 * candidates are ranked by modality fit FIRST — models that read the
 * attachments directly, then text-only models chat-service can transform the
 * attachments for, then (only when nothing better survived the filters)
 * models that would get a partial text version. Exposure, health and plan are
 * applied before the ranking and never relaxed by it. With no attachments
 * every candidate is DIRECT and the order is exactly the old one.
 */
export function selectCloudRouterCandidates(
  deployments: readonly RoutableDeploymentRecord[],
  filter: CloudRouterCandidateFilter,
): EligibleDeploymentRecord[] {
  const required = filter.requiredModalities ?? [];
  const transformable = filter.transformableModalities ?? [];
  const fit = deployments
    .filter((deployment) => isFit(deployment, filter))
    .map((deployment) => ({
      ...deployment,
      modalityFit: modalityFitOf(deployment, required, transformable),
    }));
  const servable = fit.some((deployment) => deployment.modalityFit !== ModalityFit.DEGRADED)
    ? fit.filter((deployment) => deployment.modalityFit !== ModalityFit.DEGRADED)
    : fit;
  const tiers = [...new Set(servable.map((deployment) => deployment.modalityFit))].sort(
    (a, b) => modalityFitRank(a) - modalityFitRank(b),
  );
  const picked: EligibleDeploymentRecord[] = [];
  for (const tier of tiers) {
    const members = servable.filter((deployment) => deployment.modalityFit === tier);
    picked.push(...roundRobin(members, filter.max - picked.length, required.length > 0));
  }
  return picked;
}

/** One model per provider in turn, ACTIVE first inside each provider. */
function roundRobin(
  fit: ReadonlyArray<RankedDeploymentRecord>,
  max: number,
  tagFit: boolean,
): EligibleDeploymentRecord[] {
  const byProvider = new Map<string, Array<RankedDeploymentRecord>>();
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
  while (picked.length < max && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && picked.length < max) {
        picked.push({
          id: next.id,
          provider: next.provider,
          providerModelId: next.providerModelId,
          ...(tagFit ? { modalityFit: next.modalityFit } : {}),
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
