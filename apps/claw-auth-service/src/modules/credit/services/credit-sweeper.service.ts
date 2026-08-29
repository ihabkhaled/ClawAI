import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import {
  PAYG_GRANT_RENEWAL_LOCK_KEY,
  PAYG_RESERVATION_TTL_MS,
  PAYG_SWEEP_LOCK_KEY,
} from '@claw/shared-constants';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import { WeightedUsageRepository } from '../../quota/repositories/weighted-usage.repository';
import { CREDIT_RELEASE_REASON_TIMEOUT } from '../constants/credit-release-reason.constants';
import {
  CREDIT_GRANT_RENEWAL_INTERVAL_MS,
  CREDIT_JOB_LOCK_TTL_SECONDS,
  CREDIT_SWEEP_BATCH_SIZE,
  CREDIT_SWEEP_INTERVAL_MS,
} from '../constants/credit.constants';
import { CreditReservationManager } from '../managers/credit-reservation.manager';
import { CreditGrantService } from './credit-grant.service';

/**
 * The two background jobs that keep the wallet honest.
 *
 * Both take a Redis lock EVEN THOUGH auth-service runs a single replica today.
 * The lock is not there for the current topology; it is there so that scaling
 * auth-service — a one-line compose change someone will eventually make under
 * load — cannot quietly start refunding every abandoned hold twice and granting
 * every allowance twice. Correctness that depends on the replica count is
 * correctness that expires without warning.
 *
 * The two jobs hold DIFFERENT keys and run on DIFFERENT intervals. Sharing a
 * key would let the sweep starve renewal (or the reverse) forever, and equal
 * intervals would line them up on every cold boot so the loser is always
 * skipped as contended.
 */
@Injectable()
export class CreditSweeperService {
  private readonly logger = new Logger(CreditSweeperService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly usage: WeightedUsageRepository,
    private readonly reservations: CreditReservationManager,
    private readonly grants: CreditGrantService,
  ) {}

  /**
   * Reclaims holds a request abandoned.
   *
   * This is how long a crashed request keeps a customer's money, so it is not a
   * theoretical path: chat-service runs four replicas in production and a
   * rolling recreate kills in-flight streams on every deploy.
   */
  @Interval(CREDIT_SWEEP_INTERVAL_MS)
  async sweepExpiredReservations(): Promise<void> {
    await this.runLocked(PAYG_SWEEP_LOCK_KEY, 'reservation-sweep', async () => {
      const cutoff = new Date(Date.now() - PAYG_RESERVATION_TTL_MS);
      const expired = await this.usage.findExpiredPaygReservations(cutoff, CREDIT_SWEEP_BATCH_SIZE);
      if (expired.length === 0) {
        return;
      }
      this.logger.warn(`sweepExpiredReservations: reclaiming ${String(expired.length)} hold(s)`);
      for (const record of expired) {
        // `release` is idempotent by database state, so a hold another replica
        // settled a moment ago is a no-op rather than a second refund.
        await this.reservations.release(record.reservationId, CREDIT_RELEASE_REASON_TIMEOUT);
      }
    });
  }

  @Interval(CREDIT_GRANT_RENEWAL_INTERVAL_MS)
  async renewGrants(): Promise<void> {
    await this.runLocked(PAYG_GRANT_RENEWAL_LOCK_KEY, 'grant-renewal', async () => {
      const renewed = await this.grants.renewStalePeriods();
      if (renewed > 0) {
        this.logger.log(`renewGrants: renewed ${String(renewed)} wallet(s)`);
      }
    });
  }

  /**
   * Single-flight execution with an owner token.
   *
   * Warns and skips on contention rather than waiting: both jobs run on a short
   * interval, so the next tick will pick the work up, and a queue of blocked
   * runs is how a slow database turns into an unbounded pile of timers.
   * Released in `finally` so a thrown job cannot wedge the schedule until the
   * TTL expires.
   */
  private async runLocked(
    lockKey: string,
    jobName: string,
    work: () => Promise<void>,
  ): Promise<void> {
    const ownerToken = randomUUID();
    let acquired = false;
    try {
      acquired = await this.redis.acquireLock(lockKey, ownerToken, CREDIT_JOB_LOCK_TTL_SECONDS);
      if (!acquired) {
        this.logger.warn(`runLocked: skipped job=${jobName} reason=lock_contended`);
        return;
      }
      await work();
    } catch (error) {
      this.logger.error(`runLocked: job=${jobName} failed — ${(error as Error).message}`);
    } finally {
      if (acquired) {
        await this.releaseLock(lockKey, jobName, ownerToken);
      }
    }
  }

  private async releaseLock(lockKey: string, jobName: string, ownerToken: string): Promise<void> {
    try {
      const released = await this.redis.releaseLock(lockKey, ownerToken);
      if (!released) {
        this.logger.warn(`releaseLock: lock not owned job=${jobName}`);
      }
    } catch (error) {
      this.logger.error(`releaseLock: job=${jobName} failed — ${(error as Error).message}`);
    }
  }
}
