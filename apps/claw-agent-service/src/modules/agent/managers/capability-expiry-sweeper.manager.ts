import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import {
  CAPABILITY_EXECUTING_HARD_TIMEOUT_MINUTES,
  CAPABILITY_EXPIRY_SWEEP_INTERVAL_MS,
} from '../../../common/constants/capability.constants';
import { CapabilityInvocationRepository } from '../repositories/capability-invocation.repository';

@Injectable()
export class CapabilityExpirySweeperManager {
  private readonly logger = new Logger(CapabilityExpirySweeperManager.name);

  constructor(
    private readonly repo: CapabilityInvocationRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  /**
   * Transition PENDING_APPROVAL rows past expiresAt to EXPIRED.
   * Faster cadence than the workspace flagship (15 min) because
   * desktop sessions are short-lived and stale approvals are noisy.
   */
  @Interval(CAPABILITY_EXPIRY_SWEEP_INTERVAL_MS)
  async expirePendingApprovals(): Promise<void> {
    const expired = await this.repo.expireStale(new Date());
    if (expired > 0) {
      this.logger.log(`Expired ${String(expired)} capability invocation(s) past expiresAt`);
      void this.publishExpiredCount(expired);
    }
  }

  /**
   * EXECUTING for longer than CAPABILITY_EXECUTING_HARD_TIMEOUT_MINUTES
   * → mark FAILED. Stuck CLI side or lost network most often.
   */
  @Interval(CAPABILITY_EXPIRY_SWEEP_INTERVAL_MS)
  async resetStuckExecuting(): Promise<void> {
    const cutoff = new Date(
      Date.now() - CAPABILITY_EXECUTING_HARD_TIMEOUT_MINUTES * 60 * 1000,
    );
    const failed = await this.repo.resetStuckExecuting(cutoff);
    if (failed > 0) {
      this.logger.warn(
        `Marked ${String(failed)} stuck-executing capability invocation(s) as FAILED`,
      );
    }
  }

  private async publishExpiredCount(count: number): Promise<void> {
    try {
      await this.rabbitMQ.publish(EventPattern.AGENT_CAPABILITY_EXPIRED, {
        sweptCount: count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to publish AGENT_CAPABILITY_EXPIRED summary: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
