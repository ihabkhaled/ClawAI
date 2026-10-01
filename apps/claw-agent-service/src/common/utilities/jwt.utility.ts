import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  MOBILE_ACCESS_TOKEN_KEY_CONTEXT,
  MOBILE_JWT_AUDIENCE,
  MOBILE_JWT_ISSUER,
} from '@claw/shared-constants';
import { DeviceTokenClass } from '@claw/shared-types';
import { DEVICE_JWT_AUDIENCE, DEVICE_JWT_ISSUER } from '../constants/auth.constants';
import type { AccessTokenClaims, SignedAccessToken } from '../types/jwt.types';

/**
 * The key a mobile access token is signed with, derived from `JWT_SECRET`.
 *
 * Several sibling services verify a bearer with `JWT_SECRET` and check nothing
 * else, so a mobile token signed with that secret would be readable there as
 * the user. A derived key makes that impossible: no other service can verify
 * it, and rotating `JWT_SECRET` still retires every mobile token. Same
 * construction as the Grafana cookie (rule 16 section 10).
 */
export function deriveMobileAccessKey(secret: string): string {
  return createHmac('sha256', secret).update(MOBILE_ACCESS_TOKEN_KEY_CONTEXT).digest('hex');
}

export function signAccessToken(
  claims: AccessTokenClaims,
  secret: string,
  ttlSeconds: number,
): SignedAccessToken {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const mobile = claims.tokenClass === DeviceTokenClass.MOBILE;
  const token = jwt.sign(
    {
      sub: claims.sub,
      deviceId: claims.deviceId,
      scopes: claims.scopes,
      orgId: claims.orgId ?? null,
      ...(mobile ? { cls: DeviceTokenClass.MOBILE } : {}),
    },
    mobile ? deriveMobileAccessKey(secret) : secret,
    {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
      jwtid: claims.jti,
      issuer: mobile ? MOBILE_JWT_ISSUER : DEVICE_JWT_ISSUER,
      audience: mobile ? MOBILE_JWT_AUDIENCE : DEVICE_JWT_AUDIENCE,
    },
  );
  return { token, expiresIn: ttlSeconds, issuedAt };
}

function readPayload(
  token: string,
  key: string,
  audience: string,
  tokenClass: DeviceTokenClass,
): AccessTokenClaims | null {
  try {
    const payload = jwt.verify(token, key, {
      algorithms: ['HS256'],
      issuer: tokenClass === DeviceTokenClass.MOBILE ? MOBILE_JWT_ISSUER : DEVICE_JWT_ISSUER,
      audience,
    });
    if (typeof payload === 'string' || payload.sub === undefined) {
      return null;
    }
    // A desktop-key token must not call itself mobile, nor a mobile-key token desktop.
    const claimed = payload['cls'];
    if (tokenClass === DeviceTokenClass.MOBILE && claimed !== DeviceTokenClass.MOBILE) return null;
    if (tokenClass === DeviceTokenClass.DEVICE && claimed !== undefined) return null;
    return {
      sub: String(payload.sub),
      deviceId: String(payload['deviceId']),
      scopes: Array.isArray(payload['scopes']) ? (payload['scopes'] as string[]) : [],
      jti: String(payload.jti),
      orgId: typeof payload['orgId'] === 'string' ? (payload['orgId'] as string) : null,
      tokenClass,
    };
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string, secret: string): AccessTokenClaims | null {
  return (
    readPayload(
      token,
      deriveMobileAccessKey(secret),
      MOBILE_JWT_AUDIENCE,
      DeviceTokenClass.MOBILE,
    ) ?? readPayload(token, secret, DEVICE_JWT_AUDIENCE, DeviceTokenClass.DEVICE)
  );
}
