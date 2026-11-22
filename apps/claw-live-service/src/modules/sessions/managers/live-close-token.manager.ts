import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { LIVE_CLOSE_TOKEN_TTL_MS } from '../constants/live-session.constants';
import type { LiveCloseTokenClaims } from '../types/live-session.types';
import { signCloseToken, verifyCloseToken } from '../utilities/live-close-token.utility';

/**
 * The navigator.sendBeacon close: a beacon cannot send the Bearer header, so
 * session creation returns a 12 h HMAC token (JWT_SECRET, domain-separated)
 * naming the session and its owner, and POST /sessions/:id/close checks it.
 */
@Injectable()
export class LiveCloseTokenManager {
  issue(sessionId: string, userId: string, now = Date.now()): string {
    return signCloseToken(AppConfig.get().JWT_SECRET, {
      sessionId,
      userId,
      expiresAt: now + LIVE_CLOSE_TOKEN_TTL_MS,
    });
  }

  /** The claims when the token is valid, unexpired and names this session; else null. */
  verify(token: string, sessionId: string, now = Date.now()): LiveCloseTokenClaims | null {
    const claims = verifyCloseToken(AppConfig.get().JWT_SECRET, token, now);
    return claims?.sessionId === sessionId ? claims : null;
  }
}
