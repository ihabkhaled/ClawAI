import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import {
  type ChatGrantRow,
  type ChatGrantView,
  type ConsentOptions,
  type ConsentRequestRow,
  type ConsentRequestView,
} from '../types/consent-request.types';

/** A PENDING row past its deadline reads EXPIRED, whether or not a sweep has written that yet. */
export function effectiveState(row: ConsentRequestRow, now: Date): ConsentRequestState {
  return row.status === ConsentRequestState.PENDING && row.expiresAt <= now
    ? ConsentRequestState.EXPIRED
    : row.status;
}

/**
 * Which buttons the card may offer. "Allow for this chat" needs a conversation and a WRITE tool.
 * "Always allow" is for a catalog install (any non-READ tool) or a WRITE tool of the user's own
 * server; DESTRUCTIVE needs the second confirmation.
 */
export function optionsFor(row: ConsentRequestRow): ConsentOptions {
  const write = row.riskLevel === RiskLevel.WRITE;
  return {
    allowChat: write && row.conversationId !== null,
    always: row.installId !== null ? true : write,
    alwaysNeedsConfirmation: row.riskLevel === RiskLevel.DESTRUCTIVE,
  };
}

export function toConsentView(row: ConsentRequestRow, now: Date): ConsentRequestView {
  return {
    id: row.id,
    pluginSlug: row.pluginSlug,
    pluginName: row.pluginName,
    toolName: row.toolName,
    toolTitle: row.toolTitle,
    riskLevel: row.riskLevel,
    conversationId: row.conversationId,
    messageId: row.messageId,
    argsPreview: row.argsPreview,
    reason: row.reason,
    status: effectiveState(row, now),
    choice: row.choice,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    decidedAt: row.decidedAt === null ? null : row.decidedAt.toISOString(),
    options: optionsFor(row),
  };
}

export function toChatGrantView(row: ChatGrantRow): ChatGrantView {
  return {
    id: row.id,
    conversationId: row.conversationId,
    pluginSlug: row.pluginSlug,
    toolName: row.toolName,
    riskLevel: row.riskLevel,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}
