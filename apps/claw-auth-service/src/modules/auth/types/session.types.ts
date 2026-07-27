import type { SessionClientKind } from '../enums/session-client-kind.enum';

export interface CreateSessionInput {
  id?: string;
  userId: string;
  refreshToken: string;
  refreshTokenHash?: string;
  familyId?: string;
  clientKind?: SessionClientKind;
  clientName?: string;
  expiresAt: Date;
}

export interface SessionReplacementInput extends CreateSessionInput {
  id: string;
  refreshTokenHash: string;
  familyId: string;
}

export interface RotateSessionInput {
  currentSessionId: string;
  usedAt: Date;
  replacement: SessionReplacementInput;
}
