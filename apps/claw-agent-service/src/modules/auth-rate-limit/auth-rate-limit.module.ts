import { Module } from '@nestjs/common';

import { AgentAuthRateLimitGuard } from './guards/agent-auth-rate-limit.guard';
import { AgentAuthRateLimitRepository } from './repositories/agent-auth-rate-limit.repository';
import { AgentAuthRateLimitService } from './services/agent-auth-rate-limit.service';

/**
 * Per-route budgets for the public device sign-in routes (rules/58, ADR-147).
 * Imported by every module whose controller uses `@AgentAuthRateLimit`, so the
 * guard resolves its service in that module's injector.
 */
@Module({
  providers: [AgentAuthRateLimitRepository, AgentAuthRateLimitService, AgentAuthRateLimitGuard],
  exports: [AgentAuthRateLimitService, AgentAuthRateLimitGuard],
})
export class AuthRateLimitModule {}
