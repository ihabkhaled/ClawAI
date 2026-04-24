import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { AppConfig } from '../../../app/config/app.config';
import { decryptString, encryptString } from '../../../common/utilities/crypto.utility';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from '../../../common/utilities/pkce.utility';
import type { OAuthInitResult, OAuthStatePayload, OAuthTokenSet } from '../types/workspace.types';
import {
  OAUTH_REFRESH_LOCK_TTL_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
  TOKEN_EXPIRY_BUFFER_SECONDS,
} from '../../../common/constants/workspace.constants';

@Injectable()
export class OAuthTokenManager {
  private readonly logger = new Logger(OAuthTokenManager.name);

  constructor(private readonly redis: RedisService) {}

  async initOAuthFlow(
    userId: string,
    provider: string,
    providerAppConfigId: string,
    redirectUri: string,
    authBaseUrl: string,
    clientId: string,
    scopes: string[],
    options: { pkce: boolean } = { pkce: true },
  ): Promise<OAuthInitResult> {
    const state = generateOAuthState();
    const verifier = options.pkce ? generateCodeVerifier() : undefined;
    const challenge = verifier !== undefined ? generateCodeChallenge(verifier) : undefined;

    const stateData: OAuthStatePayload = {
      userId,
      provider,
      providerAppConfigId,
      redirectUri,
      verifier,
    };
    await this.redis.set(
      `oauth:state:${state}`,
      JSON.stringify(stateData),
      OAUTH_STATE_TTL_SECONDS,
    );

    const baseParams: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    };
    if (challenge !== undefined) {
      baseParams['code_challenge'] = challenge;
      baseParams['code_challenge_method'] = 'S256';
    }

    return {
      authorizationUrl: `${authBaseUrl}?${new URLSearchParams(baseParams).toString()}`,
      state,
    };
  }

  async resolveOAuthState(state: string): Promise<OAuthStatePayload | null> {
    const raw = await this.redis.get(`oauth:state:${state}`);
    if (raw === null) {
      return null;
    }
    await this.redis.del(`oauth:state:${state}`);
    return JSON.parse(raw) as OAuthStatePayload;
  }

  encryptTokenSet(tokens: OAuthTokenSet): string {
    const config = AppConfig.get();
    return encryptString(JSON.stringify(tokens), config.ENCRYPTION_KEY);
  }

  decryptTokenSet(encrypted: string): OAuthTokenSet {
    const config = AppConfig.get();
    const raw = decryptString(encrypted, config.ENCRYPTION_KEY);
    return JSON.parse(raw) as OAuthTokenSet;
  }

  isTokenExpired(expiresAt?: Date): boolean {
    if (expiresAt === undefined) {
      return false;
    }
    const bufferMs = TOKEN_EXPIRY_BUFFER_SECONDS * 1000;
    return Date.now() + bufferMs >= expiresAt.getTime();
  }

  async acquireRefreshLock(connectorId: string): Promise<boolean> {
    return this.redis.setNxEx(
      `oauth:refresh_lock:${connectorId}`,
      '1',
      OAUTH_REFRESH_LOCK_TTL_SECONDS,
    );
  }

  async releaseRefreshLock(connectorId: string): Promise<void> {
    await this.redis.del(`oauth:refresh_lock:${connectorId}`);
  }

  logTokenRefresh(connectorId: string, provider: string): void {
    this.logger.log(`Token refreshed for connector ${connectorId} (${provider})`);
  }
}
