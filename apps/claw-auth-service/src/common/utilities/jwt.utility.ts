import * as crypto from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../types';
import { JWT_ALGORITHM } from '../constants';

export function signAccessToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: SignOptions['expiresIn'],
): string {
  return jwt.sign(payload, secret, { expiresIn, algorithm: JWT_ALGORITHM });
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
}

export function signRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
