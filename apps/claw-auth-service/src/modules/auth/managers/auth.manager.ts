import { Injectable } from "@nestjs/common";
import type { SignOptions } from "jsonwebtoken";
import { User } from "../../../generated/prisma";
import { AppConfig } from "../../../app/config/app.config";
import { JwtPayload } from "../../../common/types";
import { signAccessToken, signRefreshToken, verifyPassword } from "@common/utilities";
import { UserRole, UserStatus } from "../../../common/enums";
import {
  AccountSuspendedException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from "../../../common/errors";
import { AuthRepository } from "../repositories/auth.repository";
import { LoginResult, RefreshResult, TokenPair, UserProfile } from "../types/auth.types";

@Injectable()
export class AuthManager {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsException();
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.issueTokenPair(user);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        languagePreference: user.languagePreference,
        appearancePreference: user.appearancePreference,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const session = await this.authRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new InvalidRefreshTokenException();
    }

    if (session.expiresAt < new Date()) {
      await this.authRepository.deleteSession(session.id);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(session.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.authRepository.deleteSession(session.id);
      throw new InvalidRefreshTokenException();
    }

    await this.authRepository.deleteSession(session.id);

    const tokens = await this.issueTokenPair(user);
    return { tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.deleteSessionsByUserId(userId);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      languagePreference: user.languagePreference,
      appearancePreference: user.appearancePreference,
      createdAt: user.createdAt,
    };
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const config = AppConfig.get();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = signAccessToken(payload as unknown as Record<string, unknown>, config.JWT_SECRET, config.JWT_ACCESS_EXPIRY as SignOptions["expiresIn"]);

    const refreshTokenValue = signRefreshToken();

    const refreshExpiryMs = this.parseExpiry(config.JWT_REFRESH_EXPIRY);
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    await this.authRepository.createSession({
      userId: user.id,
      refreshToken: refreshTokenValue,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }

    const value = Number.parseInt(match[1] ?? "7", 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
