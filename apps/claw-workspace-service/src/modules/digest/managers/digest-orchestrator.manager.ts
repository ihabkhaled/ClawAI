import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { tryAcquireAdvisoryLock } from '../../../common/utilities/advisory-lock.utility';
import { DIGEST_LOCK_NAMESPACE } from '../constants/digest.constants';
import type { DigestSection } from '../types/digest.types';
import type { DigestScope } from '../../../generated/prisma';

import { DigestActionItemExtractorManager } from './digest-action-item-extractor.manager';
import { DigestBuilderManager } from './digest-builder.manager';

/**
 * Stream 31 — runs hourly, picks the users whose local hour preference
 * matches the current local hour for their timezone, and triggers a digest
 * snapshot build for each. Advisory-locked so only one replica fires per tick.
 */
@Injectable()
export class DigestOrchestratorManager {
  private readonly logger = new Logger(DigestOrchestratorManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly builder: DigestBuilderManager,
    private readonly extractor: DigestActionItemExtractorManager,
  ) {}

  @Cron('0 0 * * * *')
  async tick(): Promise<void> {
    const lockHeld = await tryAcquireAdvisoryLock(this.prisma, `${DIGEST_LOCK_NAMESPACE}.tick`);
    if (!lockHeld) {
      this.logger.debug('tick: another replica holds the lock — skipping');
      return;
    }
    this.logger.log('tick: starting digest orchestration');
    try {
      await this.runForScope('DAILY');
      const today = new Date();
      if (today.getUTCDay() === 5) {
        await this.runForScope('WEEKLY');
      }
    } catch (error) {
      this.logger.error(
        `tick: failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /**
   * Manual trigger entry-point used by the admin endpoint.
   */
  async triggerForUser(userId: string, scope: DigestScope, snapshotDate: Date): Promise<void> {
    this.logger.log(`triggerForUser: userId=${userId} scope=${scope}`);
    await this.buildAndExtract(userId, scope, snapshotDate);
  }

  private async buildAndExtract(
    userId: string,
    scope: DigestScope,
    snapshotDate: Date,
  ): Promise<void> {
    const snapshot = await this.builder.build({ userId, scope, snapshotDate });
    if (snapshot.errorMessage !== null) {
      return;
    }
    const sections = (snapshot.sections ?? []) as unknown as DigestSection[];
    if (!Array.isArray(sections) || sections.length === 0) {
      return;
    }
    try {
      await this.extractor.extract({
        snapshotId: snapshot.id,
        userId,
        sections,
        snapshotDate,
      });
    } catch (error) {
      this.logger.warn(
        `buildAndExtract: extractor failed snapshotId=${snapshot.id} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async runForScope(scope: DigestScope): Promise<void> {
    const candidates = await this.prisma.userDigestPreference.findMany({
      where: scope === 'DAILY' ? { dailyEnabled: true } : { weeklyEnabled: true },
    });
    const now = new Date();
    let processed = 0;
    for (const pref of candidates) {
      if (!this.matchesLocalHour(pref.timezone, scope === 'DAILY' ? pref.dailyHourLocal : pref.weeklyHourLocal, now)) {
        continue;
      }
      try {
        await this.buildAndExtract(pref.userId, scope, now);
        await this.prisma.userDigestPreference.update({
          where: { userId: pref.userId },
          data: scope === 'DAILY' ? { lastDailyAt: now } : { lastWeeklyAt: now },
        });
        processed++;
      } catch (error) {
        this.logger.warn(
          `runForScope: failed for user ${pref.userId} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    this.logger.log(`runForScope: ${scope} processed=${String(processed)} candidates=${String(candidates.length)}`);
  }

  private matchesLocalHour(timezone: string, targetHour: number, at: Date): boolean {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hourCycle: 'h23',
      });
      const parts = formatter.formatToParts(at);
      const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
      return Number.parseInt(hourPart, 10) === targetHour;
    } catch (error) {
      this.logger.warn(`matchesLocalHour: invalid timezone ${timezone}`);
      void error;
      return false;
    }
  }
}
