import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { USER_TOKEN_KIND } from '@claw/shared-constants';
import { hashBearerToken } from '@claw/shared-utilities';
import { signAccessToken, signRefreshToken } from '@common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { InvalidRefreshTokenException } from '../../../common/errors';
import { UserRole, UserStatus } from '../../../common/enums';
import {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  REFRESH_REUSE_GRACE_MS,
  SESSION_ONLY_REFRESH_TTL_SECONDS,
  TOKEN_TYPE,
} from '../constants/token-session.constants';
import { AuthRepository } from '../repositories/auth.repository';
import { SessionRevocationCacheService } from '../services/session-revocation-cache.service';
import type {
  SessionClient,
  SessionSeed,
  TokenPair,
  TokenSessionUser,
} from '../types/token-session.types';
import { expirySeconds } from '../utilities/expiry-seconds.utility';
import { isWithinReuseGrace } from '../utilities/refresh-reuse.utility';
import type { Session } from '../../../generated/prisma';

@Injectable()
export class TokenSessionManager {
  private readonly logger = new Logger(TokenSessionManager.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly revocationCache: SessionRevocationCacheService,
  ) {}

  /**
   * Revokes a family and tells every service, so an access token signed a
   * moment ago stops working now instead of at its expiry (TD-033).
   */
  private async revokeFamily(familyId: string): Promise<void> {
    await this.revocationCache.revoke(await this.authRepository.revokeSessionFamily(familyId));
  }

  async issue(user: TokenSessionUser, client: SessionClient): Promise<TokenPair> {
    return this.createSessionTokens(user, {
      familyId: randomUUID(),
      clientKind: client.kind,
      ...(client.name ? { clientName: client.name } : {}),
      persistent: client.persistent ?? true,
    });
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
      await this.revokeFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    // A replay after the grace window is treated as theft.
    if (currentSession.usedAt && !isWithinReuseGrace(currentSession.usedAt, now)) {
      await this.revokeFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(currentSession.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.revokeFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

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
        expiresAt: new Date(now.getTime() + refreshExpiresIn * 1000),
      },
    });
    if (!replacementSession) {
      return this.recoverLostRace(user, currentSession.id, currentSession.familyId);
    }

    return this.createTokenPair(
      user,
      replacementSession.id,
      replacementRefreshToken,
      refreshExpiresIn,
    );
  }

  async revokeCurrent(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.authRepository.revokeSessionForUser(sessionId, userId);
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
    await this.revokeFamily(familyId);
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
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    });

    return this.createTokenPair(user, session.id, refreshToken, refreshExpiresIn);
  }

  private refreshTtlSeconds(persistent: boolean): number {
    if (!persistent) {
      return SESSION_ONLY_REFRESH_TTL_SECONDS;
    }
    return expirySeconds(AppConfig.get().JWT_REFRESH_EXPIRY, DEFAULT_REFRESH_TOKEN_TTL_SECONDS);
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
