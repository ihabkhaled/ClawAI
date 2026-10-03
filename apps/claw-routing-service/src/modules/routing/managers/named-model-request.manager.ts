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
import type { NamedModelCatalogEntry, NamedModelOutcome } from '../types/named-model-request.types';
import type { RoutingContext } from '../types/routing.types';
import {
  findNamedModelRequest,
  hasModelDirective,
  namedModelUnavailableReason,
  resolveNamedModel,
  stripNamedModelDirective,
} from '../utilities/named-model-request.utility';

/**
 * AUTO's answer to "use nano banana to make X" / "ask grok …": the user named
 * a model in the prompt, so that model gets the request.
 *
 * Names come from the model catalog (routing-service's own deployments — no
 * cross-database read), filtered the way every AUTO candidate is: the
 * connector must not be known-down and the user's plan must allow the model.
 * A model the plan does not allow is skipped (normal routing carries on) rather
 * than being routed to and refused later, and the outcome carries the reason so
 * the answer tells the user instead of silently using another model. The catalog is read only when the
 * prompt contains a directive word, so an ordinary turn costs nothing.
 */
@Injectable()
export class NamedModelRequestManager {
  private readonly logger = new Logger(NamedModelRequestManager.name);

  constructor(private readonly deployments: ModelDeploymentRepository) {}

  async resolve(context: RoutingContext): Promise<NamedModelOutcome | null> {
    if (!hasModelDirective(context.message)) return null;
    try {
      const catalog = await this.catalogFor(context);
      const match = findNamedModelRequest(context.message, catalog);
      if (match === null) return null;
      const usable = catalog.filter((entry) => entry.allowed && entry.healthy);
      const wanted = this.wantedCapability(context);
      const resolution = resolveNamedModel(match, usable, wanted);
      if (resolution === null) {
        const reason = namedModelUnavailableReason(match, catalog, wanted);
        this.logger.log(
          `resolve: "${match.phrase}" named ${match.provider} but it cannot answer (${reason}) — normal routing, the answer will say so`,
        );
        return {
          resolution: null,
          prompt: null,
          notice: { phrase: match.phrase, provider: match.provider, reason },
        };
      }
      this.logger.log(
        `resolve: "${match.phrase}" → ${resolution.provider}/${resolution.model} (${resolution.capability})`,
      );
      return {
        resolution,
        prompt: stripNamedModelDirective(context.message, match.phrase),
        notice: null,
      };
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

  /** Every routable model with whether this user's plan and the connector's health allow it. */
  private async catalogFor(context: RoutingContext): Promise<NamedModelCatalogEntry[]> {
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
      .filter((row) => !NAMED_MODEL_UNROUTABLE_PROVIDERS.includes(row.provider))
      .map((row) => ({
        provider: row.provider,
        providerModelId: row.providerModelId,
        isActive: row.activationState === DeploymentActivationState.ACTIVE,
        allowed: allowed === null || allowed.has(modelMatchKey(row.provider, row.providerModelId)),
        healthy: context.connectorHealth?.[row.provider] !== false,
      }));
  }
}
