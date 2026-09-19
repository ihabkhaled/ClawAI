import type { SessionClientKind } from '../../../generated/prisma';

export interface SessionClient {
  kind: SessionClientKind;
  name?: string;
  /** "Remember me": false makes a short, browser-session login. Absent means true. */
  persistent?: boolean;
}

/** What a new session row copies from its login or from the family it joins. */
export interface SessionSeed {
  familyId: string;
  clientKind: SessionClientKind;
  clientName?: string;
  persistent: boolean;
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
