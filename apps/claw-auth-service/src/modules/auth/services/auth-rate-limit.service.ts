import { Injectable, Logger } from '@nestjs/common';

import { AUTH_RATE_LIMIT_POLICIES } from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitSuccessAction } from '../enums/auth-rate-limit-success-action.enum';
import { AuthRateLimitRepository } from '../repositories/auth-rate-limit.repository';
import type { AuthRateLimitDecision, AuthRateLimitSubject } from '../types/auth-rate-limit.types';
import { buildAuthRateLimitKey } from '../utilities/auth-rate-limit-key.utility';

/**
 * Applies one route's budget to one request.
 *
 * Every window of the policy is counted on every attempt, before any account
 * is looked up, so the answer is identical for an address that has an account
 * and one that does not (rule 43 §1, ADR-096). There is no lockout: a refused
 * caller waits for the window to reset, and the account itself is never
 * flagged. After a SUCCESS, `settle` gives back what the rule's `onSuccess`
 * says, so correct sign-ins do not use the budget meant for wrong ones.
 */
@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name);

  constructor(private readonly repository: AuthRateLimitRepository) {}

  async consume(
    policy: AuthRateLimitPolicy,
    subject: AuthRateLimitSubject,
  ): Promise<AuthRateLimitDecision> {
    const rules = AUTH_RATE_LIMIT_POLICIES.get(policy) ?? [];
    const hits = await Promise.all(
      rules.map(async (rule) => {
        const key = buildAuthRateLimitKey(policy, rule.scope, subject);
        if (key === null) {
          return 0;
        }
        const hit = await this.repository.hit(key, rule.windowSeconds);
        return hit !== null && hit.count > rule.limit ? Math.max(1, hit.ttlSeconds) : 0;
      }),
    );
    const retryAfterSeconds = Math.max(0, ...hits);
    if (retryAfterSeconds === 0) {
      return { allowed: true };
    }
    // Policy only: never the address, the IP or the key.
    this.logger.warn(`auth rate limit reached policy=${policy} retryAfter=${retryAfterSeconds}s`);
    return { allowed: false, retryAfterSeconds };
  }

  /** True when a success on this route gives any budget back. */
  refundsOnSuccess(policy: AuthRateLimitPolicy): boolean {
    return (AUTH_RATE_LIMIT_POLICIES.get(policy) ?? []).some(
      (rule) => rule.onSuccess !== undefined,
    );
  }

  /** Applies each rule's `onSuccess` after the handler succeeded. Never throws. */
  async settle(policy: AuthRateLimitPolicy, subject: AuthRateLimitSubject): Promise<void> {
    const rules = AUTH_RATE_LIMIT_POLICIES.get(policy) ?? [];
    await Promise.all(
      rules.map(async (rule) => {
        const key = buildAuthRateLimitKey(policy, rule.scope, subject);
        if (key === null || rule.onSuccess === undefined) {
          return;
        }
        await (rule.onSuccess === AuthRateLimitSuccessAction.RESET
          ? this.repository.reset(key)
          : this.repository.refund(key));
      }),
    );
  }
}
