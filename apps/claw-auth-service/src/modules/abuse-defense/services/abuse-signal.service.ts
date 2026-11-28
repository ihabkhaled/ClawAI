import { Injectable, Logger } from '@nestjs/common';

import { AntiAbuseCounterRepository } from '../../anti-abuse/repositories/anti-abuse-counter.repository';
import {
  ABUSE_PERSIST_INTERVAL_SECONDS,
  ABUSE_SUSPEND_LOCK_SECONDS,
  BUCKET_MS,
  COUNTED_SIGNAL_CODES,
  SECONDS_PER_MINUTE,
  USER_ID_MAX_LENGTH,
} from '../constants/abuse-defense.constants';
import { AbuseSignalOutcome } from '../enums/abuse-signal-outcome.enum';
import { AbuseSignalRepository } from '../repositories/abuse-signal.repository';
import type {
  AbuseEvidence,
  AbuseSettings,
  AbuseSignalInput,
  CountedAbuseSignalCode,
} from '../types/abuse-defense.types';
import { isCountedSignalCode, thresholdFor } from '../utilities/abuse-signal-classifier.utility';
import {
  abusePersistKey,
  abuseSignalKey,
  abuseSuspendLockKey,
} from '../utilities/abuse-signal-key.utility';
import { AbuseAuditService } from './abuse-audit.service';
import { AbuseSettingsService } from './abuse-settings.service';
import { AbuseSuspensionService } from './abuse-suspension.service';

/**
 * The one entry point for abuse evidence about an AUTHENTICATED account (ADR-233).
 *
 * Every signal is counted in a Redis fixed window (the whole decision costs one counter hit), and
 * stored as a per-minute bucket at most once a minute per (account, code), so a flood costs one row
 * a minute, not one per request. Only COUNTED codes can suspend; they do so when the window count
 * reaches the admin-set threshold AND the kill switch is on. UNCOUNTED codes (a replayed refresh
 * token, a sign-in on a banned device) are stored and logged for an administrator and never
 * suspend anyone, because they describe a victim or a shared machine, not the actor.
 *
 * `record` NEVER throws: it sits in exception filters and sign-in paths, and abuse bookkeeping must
 * not turn a refusal or a login into a 500. A Redis outage means nothing can be counted (the
 * outcome says so); the request is unaffected.
 */
@Injectable()
export class AbuseSignalService {
  private readonly logger = new Logger(AbuseSignalService.name);

  constructor(
    private readonly settings: AbuseSettingsService,
    private readonly counters: AntiAbuseCounterRepository,
    private readonly signals: AbuseSignalRepository,
    private readonly suspensions: AbuseSuspensionService,
    private readonly audit: AbuseAuditService,
  ) {}

  async record(input: AbuseSignalInput, now: Date = new Date()): Promise<AbuseSignalOutcome> {
    try {
      return await this.recordSignal(input, now);
    } catch (error: unknown) {
      this.logger.warn(
        `record: ${input.code} not recorded: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return AbuseSignalOutcome.IGNORED;
    }
  }

  private async recordSignal(input: AbuseSignalInput, now: Date): Promise<AbuseSignalOutcome> {
    const { userId, code } = input;
    if (userId.length === 0 || userId.length > USER_ID_MAX_LENGTH) {
      return AbuseSignalOutcome.IGNORED;
    }
    const settings = await this.settings.resolve();
    const hit = await this.counters.hit(
      abuseSignalKey(userId, code),
      settings.windowMinutes * SECONDS_PER_MINUTE,
    );
    if (hit === null) {
      return AbuseSignalOutcome.UNCOUNTED_NO_STORE;
    }
    if (!isCountedSignalCode(code)) {
      await this.persist(input, hit.count, false, now, false);
      if (hit.count === 1) {
        this.audit.flagged({ userId, code, source: input.source });
      }
      return AbuseSignalOutcome.FLAGGED;
    }
    return this.countSignal(input, code, settings, hit.count, now);
  }

  private async countSignal(
    input: AbuseSignalInput,
    code: CountedAbuseSignalCode,
    settings: AbuseSettings,
    total: number,
    now: Date,
  ): Promise<AbuseSignalOutcome> {
    const threshold = thresholdFor(settings.thresholds, code);
    await this.persist(input, total, true, now, total === threshold);
    if (total < threshold) {
      return AbuseSignalOutcome.RECORDED;
    }
    if (!settings.enabled) {
      if (total === threshold) {
        this.audit.thresholdCrossed({
          userId: input.userId,
          code,
          reason: 'auto-suspension is switched off',
          count: total,
        });
      }
      return AbuseSignalOutcome.RECORDED_ONLY;
    }
    return this.suspendOver(input, code, settings, total, now);
  }

  private async suspendOver(
    input: AbuseSignalInput,
    code: CountedAbuseSignalCode,
    settings: AbuseSettings,
    total: number,
    now: Date,
  ): Promise<AbuseSignalOutcome> {
    const { userId } = input;
    // One decision per minute per account: two signals landing together cannot suspend twice, and a
    // protected or already-blocked account is looked up once a minute, not once per request.
    const claimed = await this.counters.claimOnce(
      abuseSuspendLockKey(userId),
      ABUSE_SUSPEND_LOCK_SECONDS,
    );
    if (claimed !== true) {
      return claimed === false ? AbuseSignalOutcome.ALREADY_BLOCKED : AbuseSignalOutcome.RECORDED;
    }
    const result = await this.suspensions.suspend(
      { userId, code, evidence: await this.evidence(userId, code, total) },
      settings,
      now,
    );
    if (result.outcome === AbuseSignalOutcome.SUSPENDED) {
      await this.resetCounters(userId);
    } else if (result.outcome !== AbuseSignalOutcome.IGNORED) {
      this.audit.thresholdCrossed({
        userId,
        code,
        reason:
          result.outcome === AbuseSignalOutcome.PROTECTED_ACCOUNT
            ? 'administrator accounts are never auto-suspended'
            : 'the account is already banned or suspended',
        count: total,
      });
    }
    return result.outcome;
  }

  /** The counts behind the decision: the code that crossed, plus every other counted code's window. */
  private async evidence(
    userId: string,
    trigger: CountedAbuseSignalCode,
    total: number,
  ): Promise<AbuseEvidence> {
    const counts = await Promise.all(
      COUNTED_SIGNAL_CODES.map(
        async (code) =>
          [
            code,
            code === trigger
              ? total
              : ((await this.counters.read(abuseSignalKey(userId, code))) ?? 0),
          ] as const,
      ),
    );
    return Object.fromEntries(counts.filter(([, count]) => count > 0));
  }

  /** After a suspension the account starts clean: what it did is on the audit row, not in the next window. */
  private async resetCounters(userId: string): Promise<void> {
    await Promise.all(
      COUNTED_SIGNAL_CODES.map((code) => this.counters.reset(abuseSignalKey(userId, code))),
    );
  }

  /**
   * Stores the minute's bucket, at most once a minute per (account, code) unless `force` (the exact
   * moment a threshold is crossed must always be on record). A failure here (unknown account, a
   * database blip) never stops the decision above it.
   */
  private async persist(
    input: AbuseSignalInput,
    total: number,
    counted: boolean,
    now: Date,
    force: boolean,
  ): Promise<void> {
    try {
      const open =
        force ||
        (await this.counters.claimOnce(
          abusePersistKey(input.userId, input.code),
          ABUSE_PERSIST_INTERVAL_SECONDS,
        )) === true;
      if (!open) {
        return;
      }
      await this.signals.upsertBucket({
        userId: input.userId,
        code: input.code,
        source: input.source,
        count: total,
        counted,
        bucketStart: new Date(Math.floor(now.getTime() / BUCKET_MS) * BUCKET_MS),
      });
    } catch (error: unknown) {
      this.logger.warn(
        `persist: ${input.code} bucket not stored: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
