import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { FeedbackRepository } from '../repositories/feedback.repository';

/**
 * Migration `20261001-feedback-source` for the `feedback_tickets` collection.
 *
 * Mongo has no DDL: the new `source` index is built by Mongoose on boot, and
 * this step gives every pre-existing ticket its `source` (AUTHENTICATED) and a
 * null `reporterName`. It is idempotent - a second run matches nothing - so it
 * is safe on every start and on every replica. A failure is logged, never
 * fatal: a ticket without `source` is still readable, it just will not match a
 * `source` filter until the next boot.
 */
@Injectable()
export class FeedbackSourceBackfillMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeedbackSourceBackfillMigration.name);

  constructor(private readonly repository: FeedbackRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const touched = await this.repository.backfillSource();
      if (touched > 0) {
        this.logger.log(
          `feedback source backfill: ${String(touched)} ticket(s) set to AUTHENTICATED`,
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `feedback source backfill failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
