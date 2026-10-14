import { Injectable } from '@nestjs/common';

import { BreakerDecision } from '../../../common/enums/breaker-decision.enum';
import { BREAKER_FAILURE_THRESHOLD, BREAKER_HALF_OPEN_AFTER_MS } from '../constants/mcp.constants';
import { McpServersRepository } from '../repositories/mcp-servers.repository';

/**
 * A per-server circuit breaker kept in the database, so every replica sees the same state.
 * Five failures in a row open it; after 30 seconds exactly one call is let through as a probe
 * (the half-open state). A probe that succeeds closes it; one that fails reopens it for another
 * 30 seconds. A breaker without the half-open step would stay open for good.
 */
@Injectable()
export class McpServerHealthManager {
  constructor(private readonly repository: McpServersRepository) {}

  async admit(
    server: { id: string; failureCount: number; breakerOpenedAt: Date | null },
    now: number = Date.now(),
  ): Promise<BreakerDecision> {
    if (server.failureCount < BREAKER_FAILURE_THRESHOLD || server.breakerOpenedAt === null) {
      return BreakerDecision.ALLOW;
    }
    if (now - server.breakerOpenedAt.getTime() < BREAKER_HALF_OPEN_AFTER_MS) {
      return BreakerDecision.OPEN;
    }
    const won = await this.repository.claimProbe(server.id, server.breakerOpenedAt);
    return won ? BreakerDecision.PROBE : BreakerDecision.OPEN;
  }

  succeeded(serverId: string): Promise<void> {
    return this.repository.recordSuccess(serverId);
  }

  failed(serverId: string, errorCode: string): Promise<void> {
    return this.repository.recordFailure(serverId, errorCode, BREAKER_FAILURE_THRESHOLD);
  }
}
