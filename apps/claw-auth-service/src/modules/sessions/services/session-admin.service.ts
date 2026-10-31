import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors';
import type { AuthenticatedUser } from '../../../common/types';
import { SessionRevocationCacheService } from '../../auth/services/session-revocation-cache.service';
import { UsersService } from '../../users/services/users.service';
import {
  CURRENT_SESSION_CONFIRM_REQUIRED_CODE,
  SESSION_ACTIVE_CANNOT_CLEAR_CODE,
  SESSION_NOT_FOUND_CODE,
} from '../constants/session-admin.constants';
import type { ListSessionsQueryDto, TerminateSessionDto } from '../dto/session-admin.dto';
import { SessionAuditAction } from '../enums/session-audit-action.enum';
import { SessionTerminationReason } from '../enums/session-termination-reason.enum';
import { SessionAdminRepository } from '../repositories/session-admin.repository';
import type {
  ClearLogsResult,
  SessionListResult,
  TerminateResult,
} from '../types/session-admin.types';
import { toSessionFamilyView } from '../utilities/session-family-view.utility';

/**
 * What an administrator can do with ONE account's logins (ADR-204): look, end one, end all,
 * clear finished ones. Ending a login closes its rows in the database AND publishes the closed
 * ids to Redis (ADR-112), so every service's guard refuses the still-unexpired access token
 * now, and the next refresh is refused with SESSION_TERMINATED.
 *
 * Logs carry ids and counts only; never an address, a token or a hash.
 */
@Injectable()
export class SessionAdminService {
  private readonly logger = new Logger(SessionAdminService.name);

  constructor(
    private readonly repository: SessionAdminRepository,
    private readonly usersService: UsersService,
    private readonly revocationCache: SessionRevocationCacheService,
  ) {}

  async list(
    userId: string,
    query: ListSessionsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<SessionListResult> {
    const target = await this.usersService.getSessionTarget(userId);
    const now = new Date();
    const [rows, summary, currentFamilyId] = await Promise.all([
      this.repository.listFamilies(userId, query.state, query.page, query.pageSize, now),
      this.repository.summarize(userId, now),
      userId === actor.id ? this.repository.findFamilyIdBySessionId(actor.sessionId) : null,
    ]);
    const total = rows[0]?.total ?? 0;
    return {
      user: { id: target.id, username: target.username },
      data: rows.map((row) => toSessionFamilyView(row, currentFamilyId)),
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      summary,
    };
  }

  async terminateOne(
    userId: string,
    familyId: string,
    dto: TerminateSessionDto,
    actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    await this.usersService.assertSessionsManageable(userId, actor.id);
    await this.requireFamily(userId, familyId);
    if (userId === actor.id) {
      const currentFamilyId = await this.repository.findFamilyIdBySessionId(actor.sessionId);
      if (currentFamilyId === familyId) this.requireCurrentConfirmation(dto);
    }
    const ids = await this.repository.terminateOpenRows({
      userId,
      familyId,
      reason: SessionTerminationReason.ADMIN_TERMINATED,
      actorUserId: actor.id,
      at: new Date(),
    });
    await this.revocationCache.revoke(ids);
    const families = ids.length > 0 ? 1 : 0;
    await this.audit(actor.id, SessionAuditAction.TERMINATE_ONE, userId, families, ids.length);
    return { terminatedFamilies: families, terminatedRows: ids.length };
  }

  async terminateAll(
    userId: string,
    dto: TerminateSessionDto,
    actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    await this.usersService.assertSessionsManageable(userId, actor.id);
    // Ending every login of your own account includes the one you are using.
    if (userId === actor.id) this.requireCurrentConfirmation(dto);
    const ids = await this.repository.terminateOpenRows({
      userId,
      reason: SessionTerminationReason.ADMIN_TERMINATED_ALL,
      actorUserId: actor.id,
      at: new Date(),
    });
    await this.revocationCache.revoke(ids);
    const families = await this.repository.countFamilies(userId, ids);
    await this.audit(
      actor.id,
      SessionAuditAction.TERMINATE_ALL_FOR_USER,
      userId,
      families,
      ids.length,
    );
    return { terminatedFamilies: families, terminatedRows: ids.length };
  }

  async clearOne(
    userId: string,
    familyId: string,
    actor: AuthenticatedUser,
  ): Promise<ClearLogsResult> {
    await this.usersService.assertSessionsManageable(userId, actor.id);
    await this.requireFamily(userId, familyId);
    const now = new Date();
    if (await this.repository.isFamilyActive(userId, familyId, now)) {
      throw new BusinessException(
        'An active session must be terminated before its log can be cleared',
        SESSION_ACTIVE_CANNOT_CLEAR_CODE,
        HttpStatus.CONFLICT,
      );
    }
    const result = await this.repository.deleteInactiveFamilies({ userId, familyId, now });
    await this.audit(
      actor.id,
      SessionAuditAction.CLEAR_ONE_LOG,
      userId,
      result.families,
      result.rows,
    );
    return result;
  }

  async clearInactive(userId: string, actor: AuthenticatedUser): Promise<ClearLogsResult> {
    await this.usersService.assertSessionsManageable(userId, actor.id);
    const result = await this.repository.deleteInactiveFamilies({ userId, now: new Date() });
    await this.audit(
      actor.id,
      SessionAuditAction.CLEAR_USER_LOGS,
      userId,
      result.families,
      result.rows,
    );
    return result;
  }

  private async requireFamily(userId: string, familyId: string): Promise<void> {
    if (await this.repository.familyExistsForUser(userId, familyId)) return;
    throw new BusinessException('Session not found', SESSION_NOT_FOUND_CODE, HttpStatus.NOT_FOUND);
  }

  private requireCurrentConfirmation(dto: TerminateSessionDto): void {
    if (dto.confirmCurrent === true) return;
    throw new BusinessException(
      'This is your current session; confirm to end it',
      CURRENT_SESSION_CONFIRM_REQUIRED_CODE,
      HttpStatus.CONFLICT,
    );
  }

  private async audit(
    actorUserId: string,
    action: SessionAuditAction,
    targetUserId: string,
    familyCount: number,
    rowCount: number,
  ): Promise<void> {
    this.logger.log(
      `${action}: actor=${actorUserId} target=${targetUserId} families=${String(familyCount)} rows=${String(rowCount)}`,
    );
    try {
      await this.repository.writeAudit({
        actorUserId,
        action,
        targetUserId,
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
