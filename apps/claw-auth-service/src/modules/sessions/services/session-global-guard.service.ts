import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { burnPasswordVerification, constantTimeEqual, verifyPassword } from '@common/utilities';
import { BusinessException } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  GLOBAL_PASSWORD_FAILURE_KEY_PREFIX,
  GLOBAL_PASSWORD_INVALID_CODE,
  GLOBAL_PASSWORD_LOCKED_CODE,
  GLOBAL_PASSWORD_MAX_FAILURES,
  GLOBAL_PASSWORD_WINDOW_SECONDS,
  GLOBAL_PHRASE_INVALID_CODE,
  GLOBAL_TOKEN_BYTES,
  GLOBAL_TOKEN_INVALID_CODE,
  GLOBAL_TOKEN_KEY_PREFIX,
  GLOBAL_TOKEN_TTL_SECONDS,
} from '../constants/session-admin.constants';
import { SessionAuditAction } from '../enums/session-audit-action.enum';
import type { SessionGlobalAction } from '../enums/session-global-action.enum';
import { SessionAdminRepository } from '../repositories/session-admin.repository';
import type { GlobalChallengeResult, StoredChallenge } from '../types/session-admin.types';

/**
 * Step one and the gate of step two for the system-wide session actions (ADR-204).
 *
 * Step one proves the administrator again with THEIR OWN password (argon2, constant-time by
 * construction; a wrong one is counted per administrator and locks the step after
 * GLOBAL_PASSWORD_MAX_FAILURES in the window) and hands back a random one-time token. Only its
 * SHA-256 is stored in Redis, bound to that administrator and that action, for
 * GLOBAL_TOKEN_TTL_SECONDS. Step two consumes it with an atomic GETDEL, so it works once.
 *
 * The password and the token are never logged and never audited; a failed attempt is logged
 * with the administrator id only.
 */
@Injectable()
export class SessionGlobalGuardService {
  private readonly logger = new Logger(SessionGlobalGuardService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly repository: SessionAdminRepository,
  ) {}

  async issueChallenge(
    adminId: string,
    action: SessionGlobalAction,
    password: string,
  ): Promise<GlobalChallengeResult> {
    await this.assertNotLocked(adminId);
    const hash = await this.repository.findPasswordHash(adminId);
    const valid =
      hash === null
        ? await burnPasswordVerification(password)
        : await verifyPassword(hash, password);
    if (!valid) {
      await this.recordFailure(adminId);
      throw new BusinessException(
        'The password is not correct',
        GLOBAL_PASSWORD_INVALID_CODE,
        HttpStatus.FORBIDDEN,
      );
    }
    await this.redis.del(this.failureKey(adminId));

    const token = randomBytes(GLOBAL_TOKEN_BYTES).toString('base64url');
    const stored: StoredChallenge = { adminId, action };
    await this.redis.set(this.tokenKey(token), JSON.stringify(stored), GLOBAL_TOKEN_TTL_SECONDS);
    return { token, expiresInSeconds: GLOBAL_TOKEN_TTL_SECONDS };
  }

  /** The typed phrase must match exactly. Checked before the token is spent, so a typo costs nothing. */
  assertPhrase(provided: string, expected: string): void {
    if (constantTimeEqual(provided, expected)) return;
    throw new BusinessException(
      'The confirmation phrase does not match',
      GLOBAL_PHRASE_INVALID_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }

  /** Spends the token. Missing, expired, already used, or issued to someone else / for another action: all the same refusal. */
  async consume(adminId: string, action: SessionGlobalAction, token: string): Promise<void> {
    const raw = await this.redis.getClient().getdel(this.tokenKey(token));
    const stored = raw === null ? null : this.parse(raw);
    const ok =
      stored !== null &&
      constantTimeEqual(stored.adminId, adminId) &&
      constantTimeEqual(stored.action, action);
    if (ok) return;
    this.logger.warn(`global session token refused: actor=${adminId} action=${action}`);
    throw new BusinessException(
      'The confirmation expired or was already used; start again',
      GLOBAL_TOKEN_INVALID_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  private async assertNotLocked(adminId: string): Promise<void> {
    const raw = await this.redis.get(this.failureKey(adminId));
    const failures = raw === null ? 0 : Number.parseInt(raw, 10);
    if (Number.isFinite(failures) && failures >= GLOBAL_PASSWORD_MAX_FAILURES) {
      this.logger.warn(`global session password step locked: actor=${adminId}`);
      throw new BusinessException(
        'Too many wrong passwords; try again later',
        GLOBAL_PASSWORD_LOCKED_CODE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailure(adminId: string): Promise<void> {
    const hit = await this.redis.incrementWindow(
      this.failureKey(adminId),
      GLOBAL_PASSWORD_WINDOW_SECONDS,
    );
    this.logger.warn(
      `global session password failed: actor=${adminId} attempt=${String(hit.count)}`,
    );
    try {
      await this.repository.writeAudit({
        actorUserId: adminId,
        action: SessionAuditAction.GLOBAL_PASSWORD_FAILED,
        targetUserId: null,
        familyCount: 0,
        rowCount: hit.count,
      });
    } catch (error: unknown) {
      this.logger.error(
        `audit write failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private parse(raw: string): StoredChallenge | null {
    try {
      const value: unknown = JSON.parse(raw);
      if (
        typeof value === 'object' &&
        value !== null &&
        'adminId' in value &&
        'action' in value &&
        typeof value.adminId === 'string' &&
        typeof value.action === 'string'
      ) {
        return { adminId: value.adminId, action: value.action };
      }
    } catch {
      return null;
    }
    return null;
  }

  private tokenKey(token: string): string {
    return `${GLOBAL_TOKEN_KEY_PREFIX}${createHash('sha256').update(token).digest('hex')}`;
  }

  private failureKey(adminId: string): string {
    return `${GLOBAL_PASSWORD_FAILURE_KEY_PREFIX}${adminId}`;
  }
}
