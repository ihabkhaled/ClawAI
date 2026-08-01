import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
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
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TOKEN_TYPE,
} from '../constants/token-session.constants';
import { AuthRepository } from '../repositories/auth.repository';
import type { SessionClient, TokenPair, TokenSessionUser } from '../types/token-session.types';

@Injectable()
export class TokenSessionManager {
  constructor(private readonly authRepository: AuthRepository) {}

  async issue(user: TokenSessionUser, client: SessionClient): Promise<TokenPair> {
    const familyId = randomUUID();
    const refreshToken = signRefreshToken();
    const config = AppConfig.get();
    const refreshExpiresIn = this.parseExpirySeconds(
      config.JWT_REFRESH_EXPIRY,
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
    );
    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(refreshToken, config.JWT_SECRET),
      familyId,
      clientKind: client.kind,
      ...(client.name ? { clientName: client.name } : {}),
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    });

    return this.createTokenPair(user, session.id, refreshToken, refreshExpiresIn);
  }

  async rotate(rawRefreshToken: string): Promise<TokenPair> {
    const config = AppConfig.get();
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken, config.JWT_SECRET);
    const currentSession =
      await this.authRepository.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!currentSession) {
      throw new InvalidRefreshTokenException();
    }

    if (
      currentSession.usedAt ||
      currentSession.revokedAt ||
      currentSession.expiresAt <= new Date()
    ) {
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(currentSession.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
    }

    const replacementRefreshToken = signRefreshToken();
    const refreshExpiresIn = this.parseExpirySeconds(
      config.JWT_REFRESH_EXPIRY,
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
    );
    const replacementId = randomUUID();
    const replacementSession = await this.authRepository.rotateSession({
      currentSessionId: currentSession.id,
      usedAt: new Date(),
      replacement: {
        id: replacementId,
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(replacementRefreshToken, config.JWT_SECRET),
        familyId: currentSession.familyId,
        clientKind: currentSession.clientKind,
        ...(currentSession.clientName ? { clientName: currentSession.clientName } : {}),
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      },
    });
    if (!replacementSession) {
      await this.authRepository.revokeSessionFamily(currentSession.familyId);
      throw new InvalidRefreshTokenException();
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
