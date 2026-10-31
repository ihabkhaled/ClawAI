import type { SessionClientKind } from '../../../generated/prisma';
import type { SessionOrigin } from './session.types';

export interface SessionClient {
  kind: SessionClientKind;
  name?: string;
  /** "Remember me": false makes a short, browser-session login. Absent means true. */
  persistent?: boolean;
  /** Where this login came from; absent means unknown (device and VS Code sign-in paths that have no request). */
  origin?: SessionOrigin;
}

/** What a new session row copies from its login or from the family it joins. */
export interface SessionSeed {
  familyId: string;
  clientKind: SessionClientKind;
  clientName?: string;
  persistent: boolean;
  origin: SessionOrigin;
}

export interface TokenSessionUser {
  id: string;
  email: string;
  role: string;
  status: string;
  /** Admin ban columns (ADR-200); absent or null = not banned. */
  bannedAt?: Date | null;
  bannedUntil?: Date | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}
