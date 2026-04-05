import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';
import { JWT_ALGORITHM } from '../constants';

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
}
