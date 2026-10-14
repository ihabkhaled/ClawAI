import { ConsentChoiceKind } from '../../../common/enums/consent-choice.enum';
import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type ConsentRequestRow } from '../types/consent-request.types';

export const OWNER = 'user-1';
export const STRANGER = 'user-2';
export const REQUEST_ID = '0d5e8a54-1c1b-4a39-9a3a-6d1f4f0d2b11';
export const CALL = 'chat-call-0001';
export const HASH = 'a'.repeat(64);
export const NOW = new Date('2026-10-15T10:00:00.000Z');
export const LATER = new Date(NOW.getTime() + 60_000);

export function requestRow(overrides: Partial<ConsentRequestRow> = {}): ConsentRequestRow {
  return {
    id: REQUEST_ID,
    userId: OWNER,
    installId: '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10',
    serverId: null,
    pluginSlug: 'notes',
    pluginName: 'Notes',
    toolName: 'create_note',
    toolTitle: 'Create a note',
    riskLevel: RiskLevel.WRITE,
    callId: CALL,
    conversationId: 'thread-1',
    messageId: 'msg-1',
    surface: 'chat',
    argsHash: HASH,
    argsPreview: '{"title":"x"}',
    reason: 'REQUIRED_FIRST_USE',
    status: ConsentRequestState.PENDING,
    choice: null,
    createdAt: NOW,
    expiresAt: LATER,
    decidedAt: null,
    consumedAt: null,
    ...overrides,
  };
}

export const CHOICE = ConsentChoiceKind;
