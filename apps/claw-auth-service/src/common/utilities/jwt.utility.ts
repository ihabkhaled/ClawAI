import * as crypto from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import type { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../types';
import { JWT_ALGORITHM } from '../constants';

const logger = new Logger('JwtUtility');

export function signAccessToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: SignOptions['expiresIn'],
): string {
  logger.debug(`signAccessToken: signing token for sub=${String(payload['sub'] ?? 'unknown')} expiresIn=${String(expiresIn)}`);
  const token = jwt.sign(payload, secret, { expiresIn, algorithm: JWT_ALGORITHM });
  logger.debug('signAccessToken: token signed successfully');
  return token;
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  logger.debug('verifyAccessToken: verifying access token');
  const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
  logger.debug(`verifyAccessToken: token verified for sub=${String(decoded.sub)}`);
  return decoded;
}

export function signRefreshToken(): string {
  logger.debug('signRefreshToken: generating random refresh token');
  const token = crypto.randomBytes(48).toString('hex');
  logger.debug('signRefreshToken: refresh token generated');
  return token;
}
