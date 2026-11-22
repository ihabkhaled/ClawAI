import {
  type ForbiddenException,
  Inject,
  Injectable,
  Logger,
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
import type { CostClassIndex } from '../types/model-cost-class.types';
import type {
  ModelRef,
  PreflightRole,
  StoredGenerationSelections,
} from '../types/generation-preflight.types';
import {
  allowanceUnavailableDenial,
  assertGenerationPermitted,
  assertModelsKnown,
  assertModelsOnPlan,
  assertSpendCapAllowed,
  collectPreflightRoles,
  collectRetryRoles,
  countFallbacks,
  distinctModelRefs,
  isFallbackOnPlan,
  isNotInPlanDenial,
  missingFeaturesDenial,
  modelKey,
  retrySpendCapMicroUsd,
  withUsableFallbacks,
} from '../utilities/generation-preflight.utility';
import { costClassKey, needsCostClasses } from '../utilities/model-cost-class.utility';
import { ModelCatalogClient } from './model-catalog.client';
import { ModelCostClassClient } from './model-cost-class.client';

/**
 * Refuses a generation that cannot succeed before any job, budget or model call exists:
 * a spend cap below the minimum, a role without permission, a model the catalog does not know
 * and a model the caller's plan does not include. It reads the catalog and the plan only; it
 * never calls a paid model. A start and a retry check the same things (ADR-176); a start drops an
 * unusable fallback instead of refusing, because its request can still be changed before queueing.
 */
@Injectable()
export class GenerationPreflightService {
  private readonly logger = new Logger(GenerationPreflightService.name);

  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly catalog: ModelCatalogClient,
    private readonly costClasses: ModelCostClassClient,
  ) {}

  /**
   * Checks a start and answers the request to queue: the same request with every fallback the
   * catalog does not know, the plan excludes or no price covers removed. A primary pick is never
   * dropped; it is refused as before. The client builds fallbacks from its own model list, which
   * can hold models Threads cannot use (a video detector), and one bad backup must not block a
   * run whose picks are valid.
   */
  async prepareStart(
    ownerId: string,
    input: StartThreadGenerationDto,
  ): Promise<StartThreadGenerationDto> {
    assertSpendCapAllowed(input.capMicroUsd);
    const roles = collectPreflightRoles(input);
    const [entitlements, knownKeys] = await Promise.all([
      this.loadEntitlements(ownerId),
      this.loadKnownKeys(roles),
    ]);
    assertGenerationPermitted(entitlements);
    const primaries = roles.filter((role) => !role.isFallback);
    assertModelsKnown(primaries, knownKeys);
    const known = withUsableFallbacks(input, (fallback) => knownKeys.has(modelKey(fallback)));
    const refs = distinctModelRefs(collectPreflightRoles(known));
    const classes = await this.costClasses.forPlan(entitlements, refs);
    this.assertPricesRead(entitlements, distinctModelRefs(primaries), classes);
    assertModelsOnPlan(entitlements, primaries, classes);
    const usable = withUsableFallbacks(known, (fallback) =>
      isFallbackOnPlan(entitlements, fallback, classes),
    );
    const dropped = countFallbacks(input) - countFallbacks(usable);
    if (dropped > 0) {
      this.logger.log(`Dropped ${String(dropped)} unusable fallback model(s) from a Thread start`);
    }
    return usable;
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
    const [entitlements, knownKeys] = await Promise.all([
      this.loadEntitlements(ownerId),
      this.loadKnownKeys(roles),
    ]);
    assertGenerationPermitted(entitlements);
    // A name the catalog has never heard of is reported as that, not as "not on your plan".
    assertModelsKnown(roles, knownKeys);
    // A cost-class plan decides by each model's price band, so the band is read from routing-service
    // (ADR-198). Only models the catalog knows are asked about. No answer means no decision: the
    // start is refused with a 503 rather than guessed at (fail closed).
    const refs = distinctModelRefs(roles);
    const classes = await this.costClasses.forPlan(entitlements, refs);
    this.assertPricesRead(entitlements, refs, classes);
    assertModelsOnPlan(entitlements, roles, classes);
  }

  private assertPricesRead(
    entitlements: UserEntitlements,
    refs: readonly ModelRef[],
    classes: CostClassIndex,
  ): void {
    if (
      needsCostClasses(entitlements) &&
      refs.some(({ provider, model }) => !classes.has(costClassKey(provider, model)))
    ) {
      throw new ServiceUnavailableException('Model prices are unavailable');
    }
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
