import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { UserRole } from '../../../common/enums';
import { SessionRevocationCacheService } from '../../auth/services/session-revocation-cache.service';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { UsersRepository } from '../../users/repositories/users.repository';
import { resolveBanState } from '../../users/service.utilities/ban-state.utility';
import { ABUSE_SYSTEM_ACTOR, MS_PER_DAY } from '../constants/abuse-defense.constants';
import { AbuseSignalOutcome } from '../enums/abuse-signal-outcome.enum';
import { AbuseSuspensionRepository } from '../repositories/abuse-suspension.repository';
import type {
  AbuseSettings,
  SuspensionRequest,
  SuspensionResult,
} from '../types/abuse-defense.types';
import { suspensionDurationMs, suspensionLevelFor } from '../utilities/abuse-escalation.utility';
import { autoSuspensionReason } from '../utilities/auto-suspension.utility';
import { AbuseAuditService } from './abuse-audit.service';

/**
 * The reversible half of the abuse response (ADR-233): a temporary suspension on the 1 h / 24 h /
 * 7 d ladder, and its lifting.
 *
 * The block IS the existing ban (`users.banned_at / banned_until / ban_reason`): sign-in, refresh
 * and the admin ban tools already honour it, and a timed ban lifts itself by the clock. This
 * service adds the audit row, the escalation memory and the session close.
 *
 * Never suspends an administrator account (a probing admin is a human's call, and locking the
 * last admin out is worse than the abuse). Never makes anything permanent: that is an
 * administrator's decision alone.
 */
@Injectable()
export class AbuseSuspensionService {
  private readonly logger = new Logger(AbuseSuspensionService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly suspensions: AbuseSuspensionRepository,
    private readonly revocationCache: SessionRevocationCacheService,
    private readonly audit: AbuseAuditService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async suspend(
    request: SuspensionRequest,
    settings: AbuseSettings,
    now: Date = new Date(),
  ): Promise<SuspensionResult> {
    const user = await this.users.findById(request.userId);
    if (user === null) {
      return { outcome: AbuseSignalOutcome.IGNORED };
    }
    if (user.role === UserRole.ADMIN || user.isSuperAdmin) {
      return { outcome: AbuseSignalOutcome.PROTECTED_ACCOUNT };
    }
    if (
      resolveBanState({ bannedAt: user.bannedAt, bannedUntil: user.bannedUntil }, now).status ===
      'ACTIVE'
    ) {
      return { outcome: AbuseSignalOutcome.ALREADY_BLOCKED };
    }

    const since = new Date(now.getTime() - settings.escalationDays * MS_PER_DAY);
    const level = suspensionLevelFor(await this.suspensions.countLiveSince(user.id, since));
    const endsAt = new Date(now.getTime() + suspensionDurationMs(level, settings));

    const applied = await this.suspensions.apply({
      userId: user.id,
      level,
      reasonCode: request.code,
      evidence: request.evidence,
      startedAt: now,
      endsAt,
      banReason: autoSuspensionReason(request.code),
    });
    if (applied === null) {
      // Banned between the check above and the write (an admin, or a parallel replica): keep that ban.
      return { outcome: AbuseSignalOutcome.ALREADY_BLOCKED };
    }
    await this.closeAccess(user.id, now);
    this.audit.suspended({
      userId: user.id,
      level,
      code: request.code,
      endsAt,
      evidence: { ...request.evidence },
    });
    await this.publishUpdated(user.id);
    this.logger.warn(
      `suspend: user ${user.id} suspended level=${String(level)} until ${endsAt.toISOString()}`,
    );
    return { outcome: AbuseSignalOutcome.SUSPENDED, level, endsAt };
  }

  /**
   * The block alone is not enough: every open login is closed, and the ids are published so each
   * service refuses the still-unexpired access tokens now, not at their expiry (ADR-112).
   */
  private async closeAccess(userId: string, now: Date): Promise<void> {
    const closed = await this.users.revokeSessionsReturningIds(
      userId,
      SessionTerminationReason.ACCOUNT_BANNED,
      now,
    );
    await this.revocationCache.revoke(closed);
  }

  /**
   * An administrator unbanned the account: whatever suspension was running is marked lifted, with
   * who and when. Best-effort and never throws: the unban itself already happened.
   */
  async liftForUser(userId: string, actorUserId: string, now: Date = new Date()): Promise<number> {
    try {
      const lifted = await this.suspensions.liftActive(userId, actorUserId, now);
      if (lifted > 0) {
        this.audit.suspensionLifted({ userId, actorUserId, lifted });
      }
      return lifted;
    } catch (error: unknown) {
      this.logger.error(
        `liftForUser: suspension of user ${userId} could not be marked lifted`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  private async publishUpdated(userId: string): Promise<void> {
    try {
      await this.rabbitMQService.publish(EventPattern.USER_UPDATED, {
        userId,
        updatedBy: ABUSE_SYSTEM_ACTOR,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      this.logger.warn(
        `suspend: user ${userId} update event not published: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
