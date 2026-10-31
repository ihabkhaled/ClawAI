import { Injectable, Logger } from '@nestjs/common';
import { SessionAuditAction } from '../enums/session-audit-action.enum';
import { SessionGlobalAction } from '../enums/session-global-action.enum';
import type { AuthenticatedUser } from '../../../common/types';
import { AppConfig } from '../../../app/config/app.config';
import { SessionRevocationCacheService } from '../../auth/services/session-revocation-cache.service';
import { DEFAULT_ACCESS_TOKEN_TTL_SECONDS } from '../../auth/constants/token-session.constants';
import { expirySeconds } from '../../auth/utilities/expiry-seconds.utility';
import { UsersService } from '../../users/services/users.service';
import {
  GLOBAL_CLEAR_PHRASE,
  GLOBAL_TERMINATE_PHRASE,
  MAX_GLOBAL_BATCHES,
} from '../constants/session-admin.constants';
import type {
  GlobalChallengeDto,
  GlobalClearDto,
  GlobalTerminateDto,
} from '../dto/session-admin.dto';
import { SessionAdminRepository } from '../repositories/session-admin.repository';
import type {
  ClearLogsResult,
  GlobalChallengeResult,
  TerminateResult,
} from '../types/session-admin.types';
import { SessionGlobalGuardService } from './session-global-guard.service';

/**
 * The security-incident buttons (ADR-204): end EVERY login of EVERY user, and clear EVERY
 * finished session log. Super administrator only (killing other administrators' sessions is an
 * administrator mutation), and every call needs the two-step guard: the actor's own password
 * -> a one-time token, then the token plus a typed phrase.
 *
 * Kill semantics, chosen on purpose: the acting administrator's own login is KEPT unless
 * they ask otherwise, so the person who pressed the button is not thrown out of the console
 * mid-incident; every other login that existed when the call started is closed in batches of
 * REVOCATION_BATCH_SIZE (each batch published to Redis in one pipeline, so memory stays
 * bounded). Logins created after the call started are not touched, which is what guarantees the
 * loop ends; run it again and it closes those. Re-running is harmless (idempotent).
 */
@Injectable()
export class SessionGlobalService {
  private readonly logger = new Logger(SessionGlobalService.name);

  constructor(
    private readonly repository: SessionAdminRepository,
    private readonly guard: SessionGlobalGuardService,
    private readonly usersService: UsersService,
    private readonly revocationCache: SessionRevocationCacheService,
  ) {}

  async challenge(
    dto: GlobalChallengeDto,
    actor: AuthenticatedUser,
  ): Promise<GlobalChallengeResult> {
    await this.usersService.assertSuperAdminActor(actor.id);
    return this.guard.issueChallenge(actor.id, dto.action, dto.password);
  }

  async terminateEverything(
    dto: GlobalTerminateDto,
    actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    await this.usersService.assertSuperAdminActor(actor.id);
    this.guard.assertPhrase(dto.phrase, GLOBAL_TERMINATE_PHRASE);
    await this.guard.consume(actor.id, SessionGlobalAction.TERMINATE_ALL, dto.token);

    const startedAt = new Date();
    const accessCutoff = new Date(
      startedAt.getTime() -
        1_000 * expirySeconds(AppConfig.get().JWT_ACCESS_EXPIRY, DEFAULT_ACCESS_TOKEN_TTL_SECONDS),
    );
    const exceptFamilyId = dto.keepCurrentSession
      ? await this.repository.findFamilyIdBySessionId(actor.sessionId)
      : null;

    let rows = 0;
    for (let batch = 0; batch < MAX_GLOBAL_BATCHES; batch += 1) {
      const ids = await this.repository.terminateBatchGlobally({
        startedAt,
        accessCutoff,
        exceptFamilyId,
        actorUserId: actor.id,
        at: new Date(),
      });
      if (ids.length === 0) break;
      await this.revocationCache.revokeBatch(ids);
      rows += ids.length;
    }
    this.logger.warn(
      `${SessionAuditAction.GLOBAL_TERMINATE_ALL}: actor=${actor.id} rows=${String(rows)} keepCurrent=${String(dto.keepCurrentSession)}`,
    );
    await this.audit(actor.id, SessionAuditAction.GLOBAL_TERMINATE_ALL, 0, rows);
    return { terminatedFamilies: 0, terminatedRows: rows };
  }

  async clearEverything(dto: GlobalClearDto, actor: AuthenticatedUser): Promise<ClearLogsResult> {
    await this.usersService.assertSuperAdminActor(actor.id);
    this.guard.assertPhrase(dto.phrase, GLOBAL_CLEAR_PHRASE);
    await this.guard.consume(actor.id, SessionGlobalAction.CLEAR_ALL_LOGS, dto.token);

    const result = await this.repository.deleteInactiveFamilies({ userId: null, now: new Date() });
    this.logger.warn(
      `${SessionAuditAction.GLOBAL_CLEAR_LOGS}: actor=${actor.id} families=${String(result.families)} rows=${String(result.rows)}`,
    );
    await this.audit(actor.id, SessionAuditAction.GLOBAL_CLEAR_LOGS, result.families, result.rows);
    return result;
  }

  private async audit(
    actorUserId: string,
    action: SessionAuditAction,
    familyCount: number,
    rowCount: number,
  ): Promise<void> {
    try {
      await this.repository.writeAudit({
        actorUserId,
        action,
        targetUserId: null,
        familyCount,
        rowCount,
      });
    } catch (error: unknown) {
      this.logger.error(
        `audit write failed for ${action}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
