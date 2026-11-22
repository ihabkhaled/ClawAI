import { Inject, Injectable, Logger } from '@nestjs/common';
import { type EntitlementsAdapter } from '@claw/shared-entitlements';

import {
  LIVE_ENTITLEMENTS_ADAPTER,
  LIVE_PLAN_CACHE_MAX_ENTRIES,
  LIVE_PLAN_CACHE_MS,
} from '../constants/live-billing.constants';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { type ActiveLivePolicy, type LivePlanPolicy } from '../../policy/types/live-policy.types';

/**
 * Resolves the caller's plan slug through auth-service entitlements (the same
 * internal endpoint every service uses), cached briefly per replica. A failed
 * lookup falls back to the policy's default plan rather than blocking playback.
 */
@Injectable()
export class LivePlanResolverManager {
  private readonly logger = new Logger(LivePlanResolverManager.name);
  private readonly cache = new Map<string, { slug: string | null; expiresAt: number }>();

  constructor(
    @Inject(LIVE_ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly policies: LivePolicyService,
  ) {}

  async planSlug(userId: string): Promise<string | null> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.slug;
    let slug: string | null = null;
    try {
      const entitlements = await this.entitlements.getEntitlements(userId, { enforceTrial: false });
      slug = entitlements.plan?.slug ?? null;
    } catch (error: unknown) {
      this.logger.warn(
        `plan lookup failed userId=${userId} error=${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
    if (this.cache.size >= LIVE_PLAN_CACHE_MAX_ENTRIES) this.cache.clear();
    this.cache.set(userId, { slug, expiresAt: Date.now() + LIVE_PLAN_CACHE_MS });
    return slug;
  }

  async planPolicy(policy: ActiveLivePolicy, userId: string): Promise<LivePlanPolicy> {
    return this.policies.planPolicy(policy, await this.planSlug(userId));
  }
}
