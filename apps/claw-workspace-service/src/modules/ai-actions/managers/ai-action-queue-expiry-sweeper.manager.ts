import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import { tryAcquireAdvisoryLock } from '../../../common/utilities/advisory-lock.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AI_ACTION_QUEUE_EXPIRY_SWEEPER_LOCK_NAMESPACE } from '../constants/ai-action-policy.constants';
import { AiActionApprovalQueueRepository } from '../repositories/ai-action-approval-queue.repository';

@Injectable()
export class AiActionQueueExpirySweeperManager {
  private readonly logger = new Logger(AiActionQueueExpirySweeperManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AiActionApprovalQueueRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  @Cron(AppConfig.get().AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON, {
    name: 'workspace.ai_action.queue_expiry',
  })
  async tick(): Promise<void> {
    const acquired = await tryAcquireAdvisoryLock(
      this.prisma,
      AI_ACTION_QUEUE_EXPIRY_SWEEPER_LOCK_NAMESPACE,
    );
    if (!acquired) return;
    try {
      await this.sweep();
    } catch (error) {
      this.logger.error(
        `expiry sweeper failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async sweep(): Promise<void> {
    const now = new Date();
    const expired = await this.repo.findExpired(
      now,
      AppConfig.get().AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT,
    );
    if (expired.length === 0) return;
    this.logger.log(`expiring ${String(expired.length)} pending suggestions`);
    for (const row of expired) {
      const updated = await this.repo.updateStatus(row.id, AiActionQueueStatus.EXPIRED);
      try {
        await this.rabbitmq.publish(EventPattern.AI_ACTION_EXPIRED, {
          queueId: updated.id,
          userId: updated.userId,
          actionKind: updated.actionKind,
          provider: updated.provider,
          riskScore: updated.riskScore,
          riskLabel: updated.riskLabel,
          occurredAt: now.toISOString(),
        });
      } catch (error) {
        this.logger.warn(
          `expiry publish failed for ${row.id} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }
}
