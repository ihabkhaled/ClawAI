import { Injectable } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors';
import { UsersRepository } from '../../users/repositories/users.repository';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { AbuseSignalRepository } from '../repositories/abuse-signal.repository';
import { AbuseSuspensionRepository } from '../repositories/abuse-suspension.repository';
import type { AdminAbuseView } from '../types/abuse-defense.types';
import { parseEvidence } from '../utilities/auto-suspension.utility';
import { AbuseSettingsService } from './abuse-settings.service';

/**
 * What an administrator sees about one account's abuse standing (ADR-233): the suspensions the
 * system applied and whether each is still running, the stored signal buckets, and the two flags
 * that never suspend (a replayed refresh token, sign-ins on a banned device). Counts and ids
 * only. Lifting a suspension is the existing unban action, not a second control.
 */
@Injectable()
export class AbuseAdminService {
  constructor(
    private readonly users: UsersRepository,
    private readonly settings: AbuseSettingsService,
    private readonly suspensions: AbuseSuspensionRepository,
    private readonly signals: AbuseSignalRepository,
  ) {}

  async view(userId: string, now: Date = new Date()): Promise<AdminAbuseView> {
    if ((await this.users.findById(userId)) === null) {
      throw new EntityNotFoundException('User', userId);
    }
    const [settings, suspensions, signals, bannedDeviceSignins, tokenReuseEvents] =
      await Promise.all([
        this.settings.resolve(),
        this.suspensions.listRecent(userId),
        this.signals.listRecent(userId),
        this.signals.totalFor(userId, AbuseSignalCode.BANNED_DEVICE_SIGNIN),
        this.signals.totalFor(userId, AbuseSignalCode.TOKEN_REUSE),
      ]);
    return {
      autoSuspendEnabled: settings.enabled,
      suspensions: suspensions.map((row) => ({
        id: row.id,
        level: row.level,
        reasonCode: row.reasonCode,
        evidence: parseEvidence(row.evidence),
        startedAt: row.startedAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        liftedAt: row.liftedAt === null ? null : row.liftedAt.toISOString(),
        liftedByUserId: row.liftedByUserId,
        active: row.liftedAt === null && row.endsAt.getTime() > now.getTime(),
      })),
      signals: signals.map((row) => ({
        code: row.code,
        source: row.source,
        count: row.count,
        counted: row.counted,
        bucketStart: row.bucketStart.toISOString(),
      })),
      bannedDeviceSignins,
      tokenReuseEvents,
    };
  }
}
