import { type UserRole } from '../enums';

export interface UserAccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenKind: 'user';
  sessionId: string;
  iat?: number;
  exp?: number;
}
