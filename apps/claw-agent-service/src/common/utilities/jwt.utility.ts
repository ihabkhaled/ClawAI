import jwt from 'jsonwebtoken';
import type { AccessTokenClaims, SignedAccessToken } from '../types/jwt.types';

export function signAccessToken(
  claims: AccessTokenClaims,
  secret: string,
  ttlSeconds: number,
): SignedAccessToken {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const token = jwt.sign(
    {
      sub: claims.sub,
      deviceId: claims.deviceId,
      scopes: claims.scopes,
      orgId: claims.orgId ?? null,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
      jwtid: claims.jti,
      issuer: 'claw-agent-service',
      audience: 'claw-agent',
    },
  );
  return { token, expiresIn: ttlSeconds, issuedAt };
}

export function verifyAccessToken(token: string, secret: string): AccessTokenClaims | null {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'claw-agent-service',
      audience: 'claw-agent',
    });
    if (typeof payload === 'string' || payload.sub === undefined) {
      return null;
    }
    return {
      sub: String(payload.sub),
      deviceId: String(payload['deviceId']),
      scopes: Array.isArray(payload['scopes']) ? (payload['scopes'] as string[]) : [],
      jti: String(payload['jti']),
      orgId: typeof payload['orgId'] === 'string' ? (payload['orgId'] as string) : null,
    };
  } catch {
    return null;
  }
}
