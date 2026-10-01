import { Injectable } from '@nestjs/common';
import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  MOBILE_REFRESH_TOKEN_TTL_DAYS,
} from '@claw/shared-constants';
import { DeviceTokenClass } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { signAccessToken, verifyAccessToken } from '../../../common/utilities/jwt.utility';
import type { AccessTokenClaims } from '../../../common/types/jwt.types';
import {
  generateJti,
  generateRandomBase64Url,
  hashToken,
} from '../../../common/utilities/token.utility';
import { MS_PER_DAY, REFRESH_TOKEN_BYTES } from '../../../common/constants/auth.constants';
import type { AgentScope } from '../../../common/types/auth.types';
import type { IssuedTokenPair } from '../types/agent.types';

@Injectable()
export class TokenService {
  issuePair(
    userId: string,
    deviceId: string,
    scopes: AgentScope[],
    orgId: string | null,
    tokenClass: DeviceTokenClass = DeviceTokenClass.DEVICE,
  ): {
    pair: IssuedTokenPair;
    accessJti: string;
    refreshToken: string;
    refreshHash: string;
    refreshJti: string;
  } {
    const config = AppConfig.get();
    const accessJti = generateJti();
    const refreshJti = generateJti();
    const refreshToken = generateRandomBase64Url(REFRESH_TOKEN_BYTES);
    const refreshHash = hashToken(refreshToken, config.JWT_SECRET);
    const signed = signAccessToken(
      { sub: userId, deviceId, scopes, jti: accessJti, orgId, tokenClass },
      config.JWT_SECRET,
      this.accessTtlSeconds(tokenClass),
    );
    return {
      pair: {
        accessToken: signed.token,
        refreshToken,
        expiresIn: signed.expiresIn,
      },
      accessJti,
      refreshToken,
      refreshHash,
      refreshJti,
    };
  }

  /** A mobile token is never longer-lived than the ceiling, whatever the deployment sets for desktops. */
  accessTtlSeconds(tokenClass: DeviceTokenClass): number {
    const configured = AppConfig.get().AGENT_ACCESS_TTL_SECONDS;
    return tokenClass === DeviceTokenClass.MOBILE
      ? Math.min(configured, MOBILE_ACCESS_TOKEN_TTL_SECONDS)
      : configured;
  }

  /** Expiry of the refresh token issued now. */
  refreshExpiry(tokenClass: DeviceTokenClass): Date {
    const configuredDays = AppConfig.get().AGENT_REFRESH_TTL_DAYS;
    const days =
      tokenClass === DeviceTokenClass.MOBILE
        ? Math.min(configuredDays, MOBILE_REFRESH_TOKEN_TTL_DAYS)
        : configuredDays;
    return new Date(Date.now() + days * MS_PER_DAY);
  }

  hashRefresh(token: string): string {
    return hashToken(token, AppConfig.get().JWT_SECRET);
  }

  verifyAccess(token: string): AccessTokenClaims | null {
    return verifyAccessToken(token, AppConfig.get().JWT_SECRET);
  }
}
