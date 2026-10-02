import { Injectable, Logger } from '@nestjs/common';

import { AGENT_AUTH_RATE_LIMIT_POLICIES } from '../constants/agent-auth-rate-limit.constants';
import type { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitRepository } from '../repositories/agent-auth-rate-limit.repository';
import type {
  AgentAuthRateLimitDecision,
  AgentAuthRateLimitSubject,
} from '../types/agent-auth-rate-limit.types';
import { buildAgentAuthRateLimitKey } from '../utilities/agent-auth-rate-limit-key.utility';

/** Applies one route's budget to one request. No lockout: a refused caller waits. */
@Injectable()
export class AgentAuthRateLimitService {
  private readonly logger = new Logger(AgentAuthRateLimitService.name);

  constructor(private readonly repository: AgentAuthRateLimitRepository) {}

  async consume(
    policy: AgentAuthRateLimitPolicy,
    subject: AgentAuthRateLimitSubject,
  ): Promise<AgentAuthRateLimitDecision> {
    const hits = await Promise.all(
      (AGENT_AUTH_RATE_LIMIT_POLICIES.get(policy) ?? []).map(async (rule) => {
        const key = buildAgentAuthRateLimitKey(policy, rule.scope, subject);
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
    // Policy only: never the IP, the code or the key.
    this.logger.warn(
      `agent auth rate limit reached policy=${policy} retryAfter=${retryAfterSeconds}s`,
    );
    return { allowed: false, retryAfterSeconds };
  }
}
