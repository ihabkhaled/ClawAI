import type { SessionClientKind } from '../../../generated/prisma';

export interface CreateSessionInput {
  id?: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  clientKind?: SessionClientKind;
  clientName?: string;
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
