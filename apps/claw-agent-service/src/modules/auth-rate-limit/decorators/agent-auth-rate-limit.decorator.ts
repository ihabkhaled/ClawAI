import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { AGENT_AUTH_RATE_LIMIT_METADATA_KEY } from '../constants/agent-auth-rate-limit.constants';
import type { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitGuard } from '../guards/agent-auth-rate-limit.guard';

/** Puts a public device sign-in route under its per-route budget (rules/58). */
export function AgentAuthRateLimit(
  policy: AgentAuthRateLimitPolicy,
): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    SetMetadata(AGENT_AUTH_RATE_LIMIT_METADATA_KEY, policy),
    UseGuards(AgentAuthRateLimitGuard),
  );
}
