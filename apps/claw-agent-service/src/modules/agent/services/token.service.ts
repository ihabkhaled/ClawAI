import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { signAccessToken, verifyAccessToken } from '../../../common/utilities/jwt.utility';
import type { AccessTokenClaims } from '../../../common/types/jwt.types';
import {
  generateJti,
  generateRandomBase64Url,
  hashToken,
} from '../../../common/utilities/token.utility';
import { REFRESH_TOKEN_BYTES } from '../../../common/constants/auth.constants';
import type { DeviceScope } from '../../../common/enums/device-scope.enum';
import type { IssuedTokenPair } from '../types/agent.types';

@Injectable()
export class TokenService {
  issuePair(
    userId: string,
    deviceId: string,
    scopes: DeviceScope[],
    orgId: string | null,
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
      { sub: userId, deviceId, scopes, jti: accessJti, orgId },
      config.JWT_SECRET,
      config.AGENT_ACCESS_TTL_SECONDS,
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

  hashRefresh(token: string): string {
    return hashToken(token, AppConfig.get().JWT_SECRET);
  }

  verifyAccess(token: string): AccessTokenClaims | null {
    return verifyAccessToken(token, AppConfig.get().JWT_SECRET);
  }
}
