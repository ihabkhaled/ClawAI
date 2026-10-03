import { Injectable, Logger } from '@nestjs/common';
import {
  classifyImageIntent,
  classifyVideoIntent,
  modelMatchKey,
  MultimodalImageIntent,
} from '@claw/shared-utilities';
import { DeploymentActivationState } from '../../../generated/prisma';
import { NamedModelCapability } from '../../../common/enums/named-model-capability.enum';
import { NAMED_MODEL_UNROUTABLE_PROVIDERS } from '../constants/named-model-request.constants';
import { ModelDeploymentRepository } from '../repositories/model-deployment.repository';
import type { NamedModelCandidate, NamedModelResolution } from '../types/named-model-request.types';
import type { RoutingContext } from '../types/routing.types';
import {
  findNamedModelRequest,
  hasModelDirective,
  resolveNamedModel,
} from '../utilities/named-model-request.utility';

/**
 * AUTO's answer to "use nano banana to make X" / "ask grok …": the user named
 * a model in the prompt, so that model gets the request.
 *
 * Names come from the model catalog (routing-service's own deployments — no
 * cross-database read), filtered the way every AUTO candidate is: the
 * connector must not be known-down and the user's plan must allow the model.
 * A model the plan does not allow is skipped (normal routing carries on) rather
 * than being routed to and refused later. The catalog is read only when the
 * prompt contains a directive word, so an ordinary turn costs nothing.
 */
@Injectable()
export class NamedModelRequestManager {
  private readonly logger = new Logger(NamedModelRequestManager.name);

  constructor(private readonly deployments: ModelDeploymentRepository) {}

  async resolve(context: RoutingContext): Promise<NamedModelResolution | null> {
    if (!hasModelDirective(context.message)) return null;
    try {
      const candidates = await this.candidatesFor(context);
      const match = findNamedModelRequest(context.message, candidates);
      if (match === null) return null;
      const resolution = resolveNamedModel(match, candidates, this.wantedCapability(context));
      this.logger.log(
        resolution === null
          ? `resolve: "${match.phrase}" named ${match.provider} but no fitting model is routable — normal routing`
          : `resolve: "${match.phrase}" → ${resolution.provider}/${resolution.model} (${resolution.capability})`,
      );
      return resolution;
    } catch (error: unknown) {
      this.logger.warn(`resolve: catalog read failed — ${(error as Error).message}`);
      return null;
    }
  }

  /** What the request asks the named model to produce, from the shared classifiers. */
  private wantedCapability(context: RoutingContext): NamedModelCapability {
    if (classifyImageIntent(context.message, false) === MultimodalImageIntent.GENERATE) {
      return NamedModelCapability.IMAGE;
    }
    return classifyVideoIntent(context.message)
      ? NamedModelCapability.VIDEO
      : NamedModelCapability.CHAT;
  }

  private async candidatesFor(context: RoutingContext): Promise<NamedModelCandidate[]> {
    const routable = await this.deployments.findRoutableForCloudRouting();
    const allowed =
      context.modelAccessAllowAll === true || context.allowedModels === undefined
        ? null
        : new Set(
            context.allowedModels.map((entry) => {
              const slash = entry.indexOf('/');
              return modelMatchKey(entry.slice(0, slash), entry.slice(slash + 1));
            }),
          );
    return routable
      .filter(
        (row) =>
          !NAMED_MODEL_UNROUTABLE_PROVIDERS.includes(row.provider) &&
          context.connectorHealth?.[row.provider] !== false &&
          (allowed === null || allowed.has(modelMatchKey(row.provider, row.providerModelId))),
      )
      .map((row) => ({
        provider: row.provider,
        providerModelId: row.providerModelId,
        isActive: row.activationState === DeploymentActivationState.ACTIVE,
      }));
  }
}
