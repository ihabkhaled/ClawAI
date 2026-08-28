import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  describeEntitlementsFailure,
  EntitlementsAdapter,
  hasPermission,
  hasPlanFeature,
  isModelAllowedForUsage,
  ModelUsageType,
  type PlanFeature,
  type ResearchUsageFeature,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import { BillingErrorCode, Permission } from '@claw/shared-types';
import { ModelExposureClient } from '../clients/model-exposure.client';
import { ModelAuthorizationDenialReason } from '../enums/model-authorization-denial-reason.enum';
import { ModelAuthorizationMetricsService } from './model-authorization-metrics.service';
import { AppConfig } from '../../../app/config/app.config';
import { isGenerationProvider } from '../utilities/generation-provider.utility';
import { ENTITLEMENTS_TIMEOUT_MS } from '../../../common/constants';
import { BusinessException } from '../../../common/errors';
import { type SendMessageAccessOptions } from '../types/access-control.types';

// Backend enforcement of plan model-access + daily token quota + plan-level
// feature gates at the chat entry point. Fail-OPEN on entitlement-service
// errors so an auth outage never takes chat down — the auth-service itself is
// the hard source of truth and blocks anything truly forbidden once reachable.
@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);
  private readonly adapter: EntitlementsAdapter;
  private readonly exposure = new ModelExposureClient();
  private readonly metrics = new ModelAuthorizationMetricsService();

  constructor() {
    this.adapter = new EntitlementsAdapter({
      authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
      timeoutMs: ENTITLEMENTS_TIMEOUT_MS,
    });
  }

  // Throws 403 if a manually-selected model is not in the user's plan, 403 if
  // a required plan feature is locked, or 429 if the daily quota is exhausted.
  // ADMIN / unlimited / unrestricted pass. Returns the resolved entitlements
  // (or null when failing open) so the caller can forward allowedModels to the
  // router for AUTO-mode gating.
  async assertCanSendMessage(
    userId: string,
    opts: SendMessageAccessOptions = {},
  ): Promise<UserEntitlements> {
    const ent = await this.resolve(userId);
    if (opts.requireFeature !== undefined) {
      this.assertFeaturesEnabled(ent, opts.requireFeature, userId);
    }
    if (opts.requirePermission !== undefined) {
      this.assertPermissionGranted(ent, opts.requirePermission, userId);
    }
    if (opts.provider && opts.model) {
      // Timed as one decision because that is what the caller waits on: the
      // plan check is local, the exposure check is a network hop, and only the
      // sum tells you what the gate costs a message.
      const startedAt = Date.now();
      try {
        this.assertModelAllowed(ent, opts.provider, opts.model, userId);
      } catch (error) {
        this.metrics.recordDenied(ModelAuthorizationDenialReason.PLAN, Date.now() - startedAt);
        throw error;
      }
      try {
        await this.assertModelExposed(opts.provider, opts.model, userId);
      } catch (error) {
        this.metrics.recordDenied(ModelAuthorizationDenialReason.EXPOSURE, Date.now() - startedAt);
        throw error;
      }
      this.metrics.recordAllowed(Date.now() - startedAt);
    }
    this.assertQuotaRemaining(ent, userId);
    return ent;
  }

  // Asserts the user's plan unlocks the given feature. ADMIN bypasses via
  // hasPlanFeature. Throws a structured 403 BusinessException with code
  // PLAN_FEATURE_DISABLED and the feature name in the payload so the FE can
  // surface a precise error.
  assertPlanFeature(ent: UserEntitlements, feature: PlanFeature): void {
    this.assertFeatureEnabled(ent, feature, ent.userId);
  }

  // Defense-in-depth gate fired from inside the judge-referee manager right
  // before the critic LLM is invoked. The service-boundary gate
  // (assertCompareAccess) already checks `allowCriticReview` — this second
  // check ensures a future code path that bypasses the boundary (e.g. an
  // internal helper, a re-run, a regression) still cannot run the critic
  // without the plan unlock. Fails CLOSED: resolve() raises a 503 when entitlements cannot be reached,
  // and an unresolvable entitlement must not quietly unlock a paid feature.
  async assertCanUseCritic(userId: string): Promise<void> {
    const ent = await this.resolve(userId);
    this.assertFeatureEnabled(ent, 'allowCriticReview', userId);
  }

  // Centralized research-mode gate used by every chat entry point that exposes
  // the `researchMode` DTO field (normal chat + the 9 orchestration modes).
  // Combines the plan-level `allowResearchMode` unlock with the RESEARCH_USE
  // RBAC permission so a USER without RESEARCH_USE or on a plan that does not
  // unlock research gets a 403 before any enricher / research-service hop runs.
  // Fails CLOSED: resolve() raises a 503 when entitlements cannot be reached,
  // and an unresolvable entitlement must not quietly unlock a paid feature.
  async assertResearchAccess(userId: string): Promise<void> {
    const ent = await this.resolve(userId);
    this.assertFeatureEnabled(ent, 'allowResearchMode', userId);
    this.assertPermissionGranted(ent, Permission.RESEARCH_USE, userId);
  }

  private assertFeaturesEnabled(
    ent: UserEntitlements,
    features: PlanFeature | readonly PlanFeature[],
    userId: string,
  ): void {
    const list: readonly PlanFeature[] = Array.isArray(features)
      ? (features as readonly PlanFeature[])
      : [features as PlanFeature];
    for (const feature of list) {
      this.assertFeatureEnabled(ent, feature, userId);
    }
  }

  // Records actual token usage to the durable ledger after a completed message.
  // Fail-soft: a recording error must never break the user's response.
  async recordUsage(params: {
    userId: string;
    planId: string | null;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }): Promise<void> {
    try {
      await this.adapter.finalizeQuota({
        userId: params.userId,
        planId: params.planId,
        estimatedTokens: 0,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        provider: params.provider,
        model: params.model,
      });
    } catch (error) {
      this.logger.warn(
        `recordUsage: failed for user=${params.userId} — ${(error as Error).message}`,
      );
    }
  }

  async recordFeatureUsage(
    userId: string,
    feature: ResearchUsageFeature,
    requestId: string,
  ): Promise<void> {
    try {
      await this.adapter.recordFeatureUsage({ userId, feature, requestId });
    } catch (error) {
      this.logger.warn(
        `recordFeatureUsage: feature=${feature} request=${requestId} failed - ${(error as Error).message}`,
      );
    }
  }

  private assertFeatureEnabled(ent: UserEntitlements, feature: PlanFeature, userId: string): void {
    if (hasPlanFeature(ent, feature)) {
      return;
    }
    this.logger.warn(`assertFeatureEnabled: plan feature locked user=${userId} feature=${feature}`);
    throw new BusinessException(
      'Feature not available on your plan',
      'PLAN_FEATURE_DISABLED',
      HttpStatus.FORBIDDEN,
    );
  }

  // RBAC permission gate, parallels the contract emitted by shared-
  // entitlements' PermissionGuard (errorCode INSUFFICIENT_PERMISSIONS) so the
  // FE renders the same 403 it would have rendered for a guarded route. ADMIN
  // bypasses via hasPermission. Used by callers that need an in-service
  // permission check (e.g. compare-mode research enricher) and cannot decorate
  // the controller with @RequirePermissions because the gate is conditional.
  private assertPermissionGranted(
    ent: UserEntitlements,
    permission: Permission,
    userId: string,
  ): void {
    if (hasPermission(ent, permission)) {
      return;
    }
    this.logger.warn(
      `assertPermissionGranted: permission denied user=${userId} permission=${permission}`,
    );
    throw new BusinessException(
      'You do not have permission to perform this action',
      'INSUFFICIENT_PERMISSIONS',
      HttpStatus.FORBIDDEN,
    );
  }

  private assertModelAllowed(
    ent: UserEntitlements,
    provider: string,
    model: string,
    userId: string,
  ): void {
    const allowed = isModelAllowedForUsage(ent, provider, model, ModelUsageType.PRIMARY);
    if (allowed) {
      return;
    }
    this.logger.warn(`assertCanSendMessage: forbidden model user=${userId} ${provider}/${model}`);
    throw new BusinessException(
      'The selected model is not available on your plan',
      'MODEL_NOT_ALLOWED_FOR_PLAN',
      HttpStatus.FORBIDDEN,
    );
  }

  // The plan check answers "is this model on the user's plan". It cannot answer
  // "does ClawAI still offer this model at all", because plan rows are plain
  // strings and an administrator can unexpose a deployment long after a plan was
  // configured. Without this, a crafted request naming an unexposed model still
  // reached the provider.
  private async assertModelExposed(provider: string, model: string, userId: string): Promise<void> {
    // Generation providers are not in the exposure registry and never can be.
    //
    // `IMAGE_*` and the file-generation provider are not connector models with
    // deployment rows; they are capabilities that resolve their own credentials
    // downstream — image-service reads the OpenAI or Gemini connector config at
    // call time and fails with a specific error when it is missing. Asking the
    // registry whether `IMAGE_GEMINI/gemini-2.5-flash-image` is an exposed
    // deployment always answered no, so picking any image model in the composer
    // returned "The selected model is not available" no matter how the
    // connectors were configured.
    if (isGenerationProvider(provider)) {
      return;
    }

    if (await this.exposure.isExposed(provider, model)) {
      return;
    }
    this.logger.warn(`assertCanSendMessage: unexposed model user=${userId} ${provider}/${model}`);
    throw new BusinessException(
      'The selected model is not available',
      'MODEL_NOT_EXPOSED',
      HttpStatus.FORBIDDEN,
    );
  }

  private assertQuotaRemaining(ent: UserEntitlements, userId: string): void {
    if (ent.quota.unlimited || ent.quota.remaining > 0) {
      return;
    }
    this.logger.warn(`assertCanSendMessage: quota exceeded user=${userId}`);
    // The code has to be the stable machine value the frontend maps, not a
    // message key. It read 'quota.dailyLimitExceeded' here while the frontend
    // mapped QUOTA_DAILY_EXCEEDED, so nothing matched and the user got this
    // sentence in English regardless of their locale.
    throw new BusinessException(
      'Daily token quota exceeded',
      BillingErrorCode.QUOTA_DAILY_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch (error: unknown) {
      // Name the actual fault. "unavailable" alone cannot distinguish a
      // timeout from a refused connection from a 500 upstream, and those are
      // three different fixes.
      this.logger.error(
        `resolve: entitlements unavailable for user=${userId} — ${describeEntitlementsFailure(
          error,
          ENTITLEMENTS_TIMEOUT_MS,
        )}`,
      );
      throw new BusinessException(
        'Entitlements are temporarily unavailable',
        'ENTITLEMENTS_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
