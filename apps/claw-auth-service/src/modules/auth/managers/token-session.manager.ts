import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { USER_TOKEN_KIND } from '@claw/shared-constants';
import { hashBearerToken } from '@claw/shared-utilities';
import { signAccessToken, signRefreshToken } from '@common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { InvalidRefreshTokenException, SessionTerminatedException } from '../../../common/errors';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { UserRole, UserStatus } from '../../../common/enums';
import {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  REFRESH_REUSE_GRACE_MS,
  SESSION_ONLY_REFRESH_TTL_SECONDS,
  TOKEN_TYPE,
  UNKNOWN_SESSION_ORIGIN,
} from '../constants/token-session.constants';
import { AuthRepository } from '../repositories/auth.repository';
import { AccountBanGateService } from '../services/account-ban-gate.service';
import { SessionRevocationCacheService } from '../services/session-revocation-cache.service';
import { UserPresenceService } from '../services/user-presence.service';
import type {
  SessionClient,
  SessionSeed,
  TokenPair,
  TokenSessionUser,
} from '../types/token-session.types';
import { expirySeconds } from '../utilities/expiry-seconds.utility';
import { originOf } from '../utilities/session-origin.utility';
import { isWithinReuseGrace } from '../utilities/refresh-reuse.utility';
import type { Session } from '../../../generated/prisma';

@Injectable()
export class TokenSessionManager {
  private readonly logger = new Logger(TokenSessionManager.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly revocationCache: SessionRevocationCacheService,
    private readonly banGate: AccountBanGateService,
    private readonly presence: UserPresenceService,
  ) {}

  /**
   * Revokes a family and tells every service, so an access token signed a
   * moment ago stops working now instead of at its expiry (TD-033).
   */
  private async revokeFamily(familyId: string, reason: SessionTerminationReason): Promise<void> {
    await this.revocationCache.revoke(
      await this.authRepository.revokeSessionFamily(familyId, reason),
    );
  }

  async issue(user: TokenSessionUser, client: SessionClient): Promise<TokenPair> {
    // Every sign-in path (password, VS Code, device) ends here, so a ban cannot be bypassed by choosing another one.
    await this.banGate.assertNotBanned(user);
    const tokens = await this.createSessionTokens(user, {
      familyId: randomUUID(),
      clientKind: client.kind,
      ...(client.name ? { clientName: client.name } : {}),
      persistent: client.persistent ?? true,
      origin: client.origin ?? UNKNOWN_SESSION_ORIGIN,
    });
    await this.presence.touch(user.id);
    return tokens;
  }

  async rotate(rawRefreshToken: string): Promise<TokenPair> {
    const config = AppConfig.get();
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken, config.JWT_SECRET);
    const currentSession =
      await this.authRepository.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!currentSession) {
      throw new InvalidRefreshTokenException();
    }

    const now = new Date();
    if (currentSession.revokedAt || currentSession.expiresAt <= now) {
      // A refresh token of a login someone already closed keeps its reason; anything else presented
      // dead (an expired token replayed while a newer one lives) is treated as reuse.
      await this.revokeFamily(
        currentSession.familyId,
        this.reasonOf(currentSession) ?? SessionTerminationReason.TOKEN_REUSE,
      );
      // A ban closes the family first, so a banned user's refresh lands here. Say so with the
      // coded error (ADR-200) instead of the generic one; every other case stays generic.
      await this.rejectIfBanned(currentSession.userId);
      if (this.reasonOf(currentSession) !== null) {
        throw new SessionTerminatedException();
      }
      throw new InvalidRefreshTokenException();
    }

    // A replay after the grace window is treated as theft.
    if (currentSession.usedAt && !isWithinReuseGrace(currentSession.usedAt, now)) {
      await this.revokeFamily(currentSession.familyId, SessionTerminationReason.TOKEN_REUSE);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(currentSession.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.revokeFamily(
        currentSession.familyId,
        SessionTerminationReason.ACCOUNT_DEACTIVATED,
      );
      throw new InvalidRefreshTokenException();
    }

    // A banned account is refused here with the coded error and its whole family is closed (ADR-200).
    try {
      await this.banGate.assertNotBanned(user);
    } catch (error: unknown) {
      await this.revokeFamily(currentSession.familyId, SessionTerminationReason.ACCOUNT_BANNED);
      throw error;
    }
    await this.presence.touch(user.id);

    if (currentSession.usedAt) {
      return this.issueSibling(user, currentSession);
    }

    const replacementRefreshToken = signRefreshToken();
    const refreshExpiresIn = this.refreshTtlSeconds(currentSession.persistent);
    const replacementId = randomUUID();
    const replacementSession = await this.authRepository.rotateSession({
      currentSessionId: currentSession.id,
      usedAt: now,
      replacement: {
        id: replacementId,
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(replacementRefreshToken, config.JWT_SECRET),
        familyId: currentSession.familyId,
        clientKind: currentSession.clientKind,
        ...(currentSession.clientName ? { clientName: currentSession.clientName } : {}),
        persistent: currentSession.persistent,
        // The login's origin belongs to the family: a refresh never overwrites it (ADR-204).
        ...originOf(currentSession),
        expiresAt: new Date(now.getTime() + refreshExpiresIn * 1000),
      },
    });
    return replacementSession
      ? this.createTokenPair(user, replacementSession.id, replacementRefreshToken, refreshExpiresIn)
      : this.recoverLostRace(user, currentSession.id, currentSession.familyId);
  }

  /** Throws ACCOUNT_BANNED when the account is banned right now; any other state returns quietly. */
  private async rejectIfBanned(userId: string): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (user) {
      await this.banGate.assertNotBanned(user);
    }
  }

  async revokeCurrent(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.authRepository.revokeSessionForUser(
      sessionId,
      userId,
      SessionTerminationReason.USER_LOGOUT,
    );
    if (revoked) {
      await this.revocationCache.revoke([sessionId]);
    }
  }

  /**
   * Another rotation of the same token won the race a moment ago. That is two
   * tabs refreshing together, not theft, as long as the session is still live.
   */
  private async recoverLostRace(
    user: TokenSessionUser,
    sessionId: string,
    familyId: string,
  ): Promise<TokenPair> {
    const latest = await this.authRepository.findSessionById(sessionId);
    if (latest?.usedAt && !latest.revokedAt && isWithinReuseGrace(latest.usedAt, new Date())) {
      return this.issueSibling(user, latest);
    }
    await this.revokeFamily(familyId, SessionTerminationReason.TOKEN_REUSE);
    throw new InvalidRefreshTokenException();
  }

  /** A new token in the same family; whoever holds the first replacement keeps it. */
  private issueSibling(user: TokenSessionUser, session: Session): Promise<TokenPair> {
    this.logger.log(
      `rotate: refresh token reused within ${String(REFRESH_REUSE_GRACE_MS)}ms; issued a sibling in family ${session.familyId}`,
    );
    return this.createSessionTokens(user, {
      familyId: session.familyId,
      clientKind: session.clientKind,
      ...(session.clientName ? { clientName: session.clientName } : {}),
      persistent: session.persistent,
      origin: originOf(session),
    });
  }

  private async createSessionTokens(user: TokenSessionUser, seed: SessionSeed): Promise<TokenPair> {
    const refreshToken = signRefreshToken();
    const config = AppConfig.get();
    const refreshExpiresIn = this.refreshTtlSeconds(seed.persistent);
    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(refreshToken, config.JWT_SECRET),
      familyId: seed.familyId,
      clientKind: seed.clientKind,
      ...(seed.clientName ? { clientName: seed.clientName } : {}),
      persistent: seed.persistent,
      ...seed.origin,
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    });

    return this.createTokenPair(user, session.id, refreshToken, refreshExpiresIn);
  }

  /** The reason a session row was closed on purpose, or null when it was not (or is a legacy row). */
  private reasonOf(session: Session): SessionTerminationReason | null {
    return (
      Object.values(SessionTerminationReason).find((r) => r === session.terminationReason) ?? null
    );
  }

  private refreshTtlSeconds(persistent: boolean): number {
    return persistent
      ? expirySeconds(AppConfig.get().JWT_REFRESH_EXPIRY, DEFAULT_REFRESH_TOKEN_TTL_SECONDS)
      : SESSION_ONLY_REFRESH_TTL_SECONDS;
  }

  private createTokenPair(
    user: TokenSessionUser,
    sessionId: string,
    refreshToken: string,
    refreshExpiresIn: number,
  ): TokenPair {
    const config = AppConfig.get();
    const expiresIn = expirySeconds(config.JWT_ACCESS_EXPIRY, DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
    const accessToken = signAccessToken(
      {
        sub: user.id,
        email: user.email,
        role: this.toUserRole(user.role),
        tokenKind: USER_TOKEN_KIND,
        sessionId,
      },
      config.JWT_SECRET,
      expiresIn,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
      tokenType: TOKEN_TYPE,
    };
  }

  private hashRefreshToken(token: string, secret: string): string {
    return hashBearerToken(token, `refresh-token:${secret}`);
  }

  private toUserRole(role: string): UserRole {
    switch (role) {
      case UserRole.ADMIN:
        return UserRole.ADMIN;
      case UserRole.OPERATOR:
        return UserRole.OPERATOR;
      case UserRole.USER:
        return UserRole.USER;
      case UserRole.VIEWER:
        return UserRole.VIEWER;
      default:
        throw new InvalidRefreshTokenException();
    }
  }
}
