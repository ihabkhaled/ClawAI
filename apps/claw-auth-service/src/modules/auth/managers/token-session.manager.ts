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
  EXPIRY_PATTERN,
  REFRESH_REUSE_GRACE_MS,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SESSION_ONLY_REFRESH_TTL_SECONDS,
  TOKEN_TYPE,
} from '../constants/token-session.constants';
import { AuthRepository } from '../repositories/auth.repository';
import type {
  SessionClient,
  SessionSeed,
  TokenPair,
  TokenSessionUser,
} from '../types/token-session.types';
import { isWithinReuseGrace } from '../utilities/refresh-reuse.utility';
import type { Session } from '../../../generated/prisma';

@Injectable()
export class TokenSessionManager {
  private readonly logger = new Logger(TokenSessionManager.name);

  constructor(private readonly authRepository: AuthRepository) {}

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
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    // A replay after the grace window is treated as theft.
    if (currentSession.usedAt && !isWithinReuseGrace(currentSession.usedAt, now)) {
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(currentSession.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
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
    await this.authRepository.revokeSessionForUser(sessionId, userId);
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
    await this.authRepository.revokeSessionFamily(familyId);
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
    return this.parseExpirySeconds(
      AppConfig.get().JWT_REFRESH_EXPIRY,
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  private createTokenPair(
    user: TokenSessionUser,
    sessionId: string,
    refreshToken: string,
    refreshExpiresIn: number,
  ): TokenPair {
    const config = AppConfig.get();
    const expiresIn = this.parseExpirySeconds(
      config.JWT_ACCESS_EXPIRY,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
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

  private parseExpirySeconds(expiry: string, fallback: number): number {
    const match = EXPIRY_PATTERN.exec(expiry);
    if (!match) {
      return fallback;
    }

    const value = Number.parseInt(match[1] ?? '', 10);
    const unit = match[2];
    switch (unit) {
      case 'd':
        return value * SECONDS_PER_DAY;
      case 'h':
        return value * SECONDS_PER_HOUR;
      case 'm':
        return value * SECONDS_PER_MINUTE;
      case 's':
        return value;
      default:
        return fallback;
    }
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
