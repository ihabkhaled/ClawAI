import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type { PreflightRole } from '../types/generation-preflight.types';
import {
  assertGenerationPermitted,
  assertModelsKnown,
  assertModelsOnPlan,
  assertSpendCapAllowed,
  collectPreflightRoles,
  distinctModelRefs,
  modelKey,
} from '../utilities/generation-preflight.utility';
import { ModelCatalogClient } from './model-catalog.client';

/**
 * Refuses a generation that cannot succeed before any job, budget or model call exists:
 * a spend cap below the minimum, a role without permission, a model the catalog does not know
 * and a model the caller's plan does not include. It reads the catalog and the plan only; it
 * never calls a paid model.
 */
@Injectable()
export class GenerationPreflightService {
  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly catalog: ModelCatalogClient,
  ) {}

  async assertCanStart(ownerId: string, input: StartThreadGenerationDto): Promise<void> {
    assertSpendCapAllowed(input.capMicroUsd);
    const roles = collectPreflightRoles(input);
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
