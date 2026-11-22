import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LIVE_POLICY_ACTIVE_KEY, LIVE_POLICY_CACHE_MS } from '../constants/live-policy.constants';
import { livePolicySchema } from '../schemas/live-policy.schema';
import type { ActiveLivePolicy, LivePlanPolicy } from '../types/live-policy.types';

/** Reads the active versioned policy, cached briefly per replica. */
@Injectable()
export class LivePolicyService {
  private cached: { value: ActiveLivePolicy; expiresAt: number } | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async active(): Promise<ActiveLivePolicy> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.value;
    const row = await this.prisma.livePolicyVersion.findUnique({
      where: { activeKey: LIVE_POLICY_ACTIVE_KEY },
    });
    if (!row) throw new ServiceUnavailableException('LIVE_POLICY_MISSING');
    const parsed = livePolicySchema.safeParse(row.config);
    if (!parsed.success) throw new ServiceUnavailableException('LIVE_POLICY_INVALID');
    const value = { version: row.version, config: parsed.data };
    this.cached = { value, expiresAt: Date.now() + LIVE_POLICY_CACHE_MS };
    return value;
  }

  /** Drops the cache so the next read sees a just-written version. */
  invalidate(): void {
    this.cached = undefined;
  }

  planPolicy(policy: ActiveLivePolicy, planSlug: string | null): LivePlanPolicy {
    const plans = new Map(Object.entries(policy.config.plans));
    return (planSlug ? plans.get(planSlug) : undefined) ?? policy.config.defaultPlan;
  }
}
