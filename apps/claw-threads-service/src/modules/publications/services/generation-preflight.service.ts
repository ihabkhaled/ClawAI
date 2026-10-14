import {
  type ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  hasPlanFeature,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import type { RetryThreadGenerationDto } from '../dto/retry-thread-generation.dto';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import { THREAD_REQUIRED_FEATURES } from '../constants/generation-preflight.constants';
import type {
  PreflightRole,
  StoredGenerationSelections,
} from '../types/generation-preflight.types';
import {
  allowanceUnavailableDenial,
  assertFallbacksUseOtherProvider,
  assertGenerationPermitted,
  assertModelsKnown,
  assertModelsOnPlan,
  assertSpendCapAllowed,
  collectPreflightRoles,
  collectRetryRoles,
  distinctModelRefs,
  isNotInPlanDenial,
  missingFeaturesDenial,
  modelKey,
  retrySpendCapMicroUsd,
} from '../utilities/generation-preflight.utility';
import { ModelCatalogClient } from './model-catalog.client';

/**
 * Refuses a generation that cannot succeed before any job, budget or model call exists:
 * a spend cap below the minimum, a role without permission, a model the catalog does not know
 * and a model the caller's plan does not include. It reads the catalog and the plan only; it
 * never calls a paid model. A start and a retry run exactly the same checks (ADR-176).
 */
@Injectable()
export class GenerationPreflightService {
  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly catalog: ModelCatalogClient,
  ) {}

  async assertCanStart(ownerId: string, input: StartThreadGenerationDto): Promise<void> {
    await this.assertCanRun(ownerId, collectPreflightRoles(input), input.capMicroUsd);
  }

  /**
   * The same checks for a retry, on the models the new attempt will really use: the owner's
   * `models` overrides, and the stored seats (fallbacks included) for everything not overridden.
   */
  async assertCanRetry(
    ownerId: string,
    stored: StoredGenerationSelections,
    input: RetryThreadGenerationDto,
  ): Promise<void> {
    const roles = collectRetryRoles(stored.roles, input.models ?? []);
    await this.assertCanRun(
      ownerId,
      roles,
      retrySpendCapMicroUsd(stored.spendCapMicroUsd, input.spendCapUsd),
    );
  }

  /**
   * The budget step answers every refusal with the same 403. When the preflight above already
   * proved the permission and the models, the plan itself is read again to say which of the two
   * it was: a feature the plan lacks, or an allowance that is used up or held by a generation
   * that is still running. Any other error answers null: keep it as it is.
   */
  async explainBudgetDenial(ownerId: string, error: unknown): Promise<ForbiddenException | null> {
    if (!isNotInPlanDenial(error)) return null;
    let entitlements: UserEntitlements;
    try {
      entitlements = await this.loadEntitlements(ownerId);
    } catch {
      return null;
    }
    const missing = THREAD_REQUIRED_FEATURES.filter(
      ({ feature }) => !hasPlanFeature(entitlements, feature),
    ).map(({ label }) => label);
    return missing.length === 0
      ? allowanceUnavailableDenial()
      : missingFeaturesDenial(entitlements.plan?.name ?? 'current', missing);
  }

  private async assertCanRun(
    ownerId: string,
    roles: readonly PreflightRole[],
    capMicroUsd: number,
  ): Promise<void> {
    assertSpendCapAllowed(capMicroUsd);
    assertFallbacksUseOtherProvider(roles);
    const [entitlements, knownKeys] = await Promise.all([
      this.loadEntitlements(ownerId),
      this.loadKnownKeys(roles),
    ]);
    assertGenerationPermitted(entitlements);
    // A name the catalog has never heard of is reported as that, not as "not on your plan".
    assertModelsKnown(roles, knownKeys);
    assertModelsOnPlan(entitlements, roles);
  }

  /** The plan the account has fallen back to counts: an ended trial is the budget step's call. */
  private async loadEntitlements(ownerId: string): Promise<UserEntitlements> {
    try {
      return await this.entitlements.getEntitlements(ownerId, { enforceTrial: false });
    } catch {
      throw new ServiceUnavailableException('Plan lookup is unavailable');
    }
  }

  private async loadKnownKeys(roles: readonly PreflightRole[]): Promise<ReadonlySet<string>> {
    const refs = distinctModelRefs(roles);
    const found = await Promise.all(
      refs.map(async (ref) => ((await this.catalog.isKnown(ref)) ? modelKey(ref) : null)),
    );
    return new Set(found.filter((key): key is string => key !== null));
  }
}
