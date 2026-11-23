import { Injectable, Logger, Optional } from '@nestjs/common';
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
import { PlanRoutingAccessManager } from './plan-routing-access.manager';
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

  constructor(
    private readonly deployments: ModelDeploymentRepository,
    @Optional()
    private readonly planAccess: PlanRoutingAccessManager = new PlanRoutingAccessManager(),
  ) {}

  async resolve(context: RoutingContext): Promise<NamedModelOutcome | null> {
    if (!hasModelDirective(context.message)) return null;
    try {
      const names = await this.catalogFor(context);
      const match = findNamedModelRequest(context.message, names);
      if (match === null) return null;
      const catalog = await this.withPlanDecision(context, names, match.provider);
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

  /** Every routable model with the connector's health; the plan decision is added after a match. */
  private async catalogFor(context: RoutingContext): Promise<NamedModelCatalogEntry[]> {
    const routable = await this.deployments.findRoutableForCloudRouting();
    return routable
      .filter((row) => !NAMED_MODEL_UNROUTABLE_PROVIDERS.includes(row.provider))
      .map((row) => ({
        provider: row.provider,
        providerModelId: row.providerModelId,
        isActive: row.activationState === DeploymentActivationState.ACTIVE,
        allowed: true,
        healthy: context.connectorHealth?.[row.provider] !== false,
      }));
  }

  /**
   * Whether this user's plan allows each model. Only the named provider's models are asked
   * about: a cost-class plan resolves a class per model, and the others cannot be picked.
   */
  private async withPlanDecision(
    context: RoutingContext,
    catalog: NamedModelCatalogEntry[],
    provider: string,
  ): Promise<NamedModelCatalogEntry[]> {
    const allowed = await this.planAccess.allowedKeys(
      context,
      catalog
        .filter((entry) => entry.provider === provider)
        .map((entry) => ({ provider: entry.provider, model: entry.providerModelId })),
    );
    if (allowed === null) return catalog;
    return catalog.map((entry) => ({
      ...entry,
      allowed: allowed.has(modelMatchKey(entry.provider, entry.providerModelId)),
    }));
  }
}
