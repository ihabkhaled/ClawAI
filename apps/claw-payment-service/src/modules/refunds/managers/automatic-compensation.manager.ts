import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ScheduledJobRunnerService } from '../../scheduled-jobs/services/scheduled-job-runner.service';
import {
  AUTOMATIC_COMPENSATION_BATCH_SIZE,
  AUTOMATIC_COMPENSATION_CRON,
  AUTOMATIC_COMPENSATION_JOB_NAME,
  AUTOMATIC_COMPENSATION_LOCK_KEY,
  AUTOMATIC_COMPENSATION_LOCK_TTL_SECONDS,
} from '../constants/payment-compensation.constants';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentCompensationService } from '../services/payment-compensation.service';

@Injectable()
export class AutomaticCompensationManager {
  private readonly logger = new Logger(AutomaticCompensationManager.name);

  constructor(
    private readonly jobs: ScheduledJobRunnerService,
    private readonly refunds: RefundRepository,
    private readonly compensation: PaymentCompensationService,
  ) {}

  @Cron(AUTOMATIC_COMPENSATION_CRON)
  async scheduledSweep(): Promise<void> {
    await this.sweep();
  }

  async sweep(now: Date = new Date()): Promise<void> {
    await this.jobs.run(
      {
        jobName: AUTOMATIC_COMPENSATION_JOB_NAME,
        lockKey: AUTOMATIC_COMPENSATION_LOCK_KEY,
        lockTtlSeconds: AUTOMATIC_COMPENSATION_LOCK_TTL_SECONDS,
      },
      async () => {
        const pending = await this.refunds.listRetryableAutomaticCompensations(
          now,
          AUTOMATIC_COMPENSATION_BATCH_SIZE,
        );
        for (const prepared of pending) {
          try {
            await this.compensation.retry(prepared);
          } catch {
            this.logger.error(`sweep: refund remains pending refund=${prepared.refund.id}`);
          }
        }
      },
    );
  }
}
