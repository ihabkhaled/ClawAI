import { type UserRole } from '../enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenKind: 'user';
  sessionId: string;
  iat?: number;
  exp?: number;
}
