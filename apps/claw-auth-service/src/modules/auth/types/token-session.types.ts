import type { SessionClientKind } from '../../../generated/prisma';

export interface SessionClient {
  kind: SessionClientKind;
  name?: string;
}

export interface TokenSessionUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}
