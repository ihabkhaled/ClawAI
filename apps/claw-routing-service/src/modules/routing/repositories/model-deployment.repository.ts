import { Injectable, Logger } from '@nestjs/common';
import { DeploymentActivationState } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES,
  CLOUD_ROUTER_NON_ANSWERING_PROVIDERS,
  CLOUD_ROUTER_SELECTABLE_STATES,
} from '../constants/cloud-router-eligibility.constants';
import type {
  EligibleDeploymentRecord,
  RoutableDeploymentRecord,
  SelectableDeploymentRecord,
} from '../types/model-deployment.types';

@Injectable()
export class ModelDeploymentRepository {
  private readonly logger = new Logger(ModelDeploymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deployments the cloud router may ever select, before ranking.
   *
   * Hard policy only — privacy class and activation state — no scoring.
   * CloudRouterManager's chain walk already handles ordering and fallback
   * over whatever this returns.
   */
  async findEligibleForCloudRouting(): Promise<EligibleDeploymentRecord[]> {
    const rows = await this.prisma.modelDeployment.findMany({
      where: {
        privacyClass: { in: [...CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES] },
        activationState: DeploymentActivationState.ACTIVE,
      },
      select: { id: true, provider: true, providerModelId: true },
    });
    this.logger.debug(`findEligibleForCloudRouting: ${String(rows.length)} eligible deployment(s)`);
    return rows;
  }

  /**
   * Every deployment the AUTO router could answer with, before the exposure,
   * health and plan filters. Router-only providers are excluded: they pick
   * routes and cannot answer a chat turn.
   */
  async findRoutableForCloudRouting(): Promise<RoutableDeploymentRecord[]> {
    const rows = await this.prisma.modelDeployment.findMany({
      where: {
        privacyClass: { in: [...CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES] },
        activationState: { in: [...CLOUD_ROUTER_SELECTABLE_STATES] },
        provider: { notIn: [...CLOUD_ROUTER_NON_ANSWERING_PROVIDERS] },
      },
      select: {
        id: true,
        provider: true,
        providerModelId: true,
        activationState: true,
        // Multimodal batch 8: what modality-fit ranking reads (rule 51 item 13).
        supportsVision: true,
        definition: { select: { modalitiesIn: true } },
      },
    });
    return rows.map(({ definition, ...row }) => ({
      ...row,
      modalitiesIn: definition.modalitiesIn,
    }));
  }

  /**
   * Every deployment an admin may put in the chain, for the picker.
   *
   * Wider than findEligibleForCloudRouting on purpose: that one answers "what
   * may the router select right now", this one answers "what may an admin
   * name". They are different questions, and narrowing this to the first would
   * hide a model the admin is allowed to configure.
   *
   * It exists because the chain's model field used to be free text, and an
   * alias resolves to a deployment exactly or not at all. Typing a retired
   * name produced an entry that silently never ran: glm-4.7, minimax-m2.1 and
   * qwen3.5 sat dead in the published chain for a month against a catalog
   * holding glm-5.2, minimax-m2.5 and qwen3.5:397b.
   */
  async findAllForChainSelection(): Promise<SelectableDeploymentRecord[]> {
    const rows = await this.prisma.modelDeployment.findMany({
      // Excluded, not included: the picker offers everything the catalog holds
      // except what an admin must not choose. Listing only ACTIVE would have
      // left 7 of 354 models pickable — every model still awaiting its first
      // validation is a legitimate choice, it just is not proven yet, and the
      // caller is told which is which rather than having the choice removed.
      where: {
        activationState: {
          notIn: [
            DeploymentActivationState.DISABLED,
            DeploymentActivationState.RETIRED,
            DeploymentActivationState.QUARANTINED,
          ],
        },
      },
      select: { id: true, provider: true, providerModelId: true, activationState: true },
      orderBy: [{ provider: 'asc' }, { providerModelId: 'asc' }],
    });
    this.logger.debug(`findAllForChainSelection: ${String(rows.length)} deployment(s)`);
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      providerModelId: row.providerModelId,
      isValidated: row.activationState === DeploymentActivationState.ACTIVE,
    }));
  }
}
