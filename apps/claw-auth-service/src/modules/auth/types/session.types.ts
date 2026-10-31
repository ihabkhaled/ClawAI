import type { SessionClientKind } from '../../../generated/prisma';

/** Request headers as Express exposes them. */
export type RequestHeaders = Record<string, string | string[] | undefined>;

/** Where a LOGIN came from (ADR-204). All null when unknown. The IP is personal data: admin-only. */
export interface SessionOrigin {
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  os: string | null;
  browser: string | null;
  deviceKind: string | null;
}

export interface CreateSessionInput extends Partial<SessionOrigin> {
  id?: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  clientKind?: SessionClientKind;
  clientName?: string;
  persistent?: boolean;
  expiresAt: Date;
}

export interface SessionReplacementInput extends CreateSessionInput {
  id: string;
}

export interface RotateSessionInput {
  currentSessionId: string;
  usedAt: Date;
  replacement: SessionReplacementInput;
}
