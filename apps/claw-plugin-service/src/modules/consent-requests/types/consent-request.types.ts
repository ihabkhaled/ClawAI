import type { ConsentChoiceKind } from '../../../common/enums/consent-choice.enum';
import type { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import type { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';

/** One row of plugin_consent_requests. */
export type ConsentRequestRow = {
  id: string;
  userId: string;
  installId: string | null;
  serverId: string | null;
  pluginSlug: string;
  pluginName: string;
  toolName: string;
  toolTitle: string;
  riskLevel: RiskLevel;
  callId: string;
  conversationId: string | null;
  messageId: string | null;
  surface: string;
  argsHash: string;
  argsPreview: string;
  reason: string;
  status: ConsentRequestState;
  choice: ConsentChoiceKind | null;
  createdAt: Date;
  expiresAt: Date;
  decidedAt: Date | null;
  consumedAt: Date | null;
};

export type OpenConsentInput = {
  userId: string;
  installId: string | null;
  serverId: string | null;
  pluginSlug: string;
  pluginName: string;
  toolName: string;
  toolTitle: string;
  riskLevel: RiskLevel;
  callId: string;
  conversationId: string | null;
  messageId: string | null;
  surface: string;
  argsHash: string;
  argsPreview: string;
  reason: string;
  expiresAt: Date;
};

/** What a decision also writes, in the same transaction as the status change. */
export type DecisionEffect =
  | { kind: 'NONE' }
  | {
      kind: 'CHAT_GRANT';
      conversationId: string;
      targetKey: string;
      pluginSlug: string;
      toolName: string;
      riskLevel: RiskLevel;
      expiresAt: Date;
    }
  | {
      kind: 'INSTALL_CONSENT';
      installId: string;
      toolName: string;
      riskLevel: RiskLevel;
      confirmedDestructive: boolean;
    }
  | { kind: 'SERVER_TOOL'; serverId: string; userId: string; toolName: string };

export type DecideInput = {
  id: string;
  userId: string;
  now: Date;
  status: ConsentRequestState.APPROVED | ConsentRequestState.DENIED;
  choice: ConsentChoiceKind;
  effect: DecisionEffect;
};

/** Which of the card's buttons this request may offer. */
export type ConsentOptions = {
  allowChat: boolean;
  always: boolean;
  alwaysNeedsConfirmation: boolean;
};

/** What the browser and chat-service see. Never carries the arguments hash or the call id. */
export type ConsentRequestView = {
  id: string;
  pluginSlug: string;
  pluginName: string;
  toolName: string;
  toolTitle: string;
  riskLevel: RiskLevel;
  conversationId: string | null;
  messageId: string | null;
  argsPreview: string;
  reason: string;
  status: ConsentRequestState;
  choice: ConsentChoiceKind | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  options: ConsentOptions;
};

export type ChatGrantRow = {
  id: string;
  userId: string;
  conversationId: string;
  targetKey: string;
  pluginSlug: string;
  toolName: string;
  riskLevel: RiskLevel;
  grantedAt: Date;
  expiresAt: Date;
};

export type ChatGrantView = {
  id: string;
  conversationId: string;
  pluginSlug: string;
  toolName: string;
  riskLevel: RiskLevel;
  grantedAt: string;
  expiresAt: string;
};

/** Why a redeem did or did not let the call through. */
export enum RedeemOutcome {
  REDEEMED = 'REDEEMED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  NOT_USABLE = 'NOT_USABLE',
}

export type ConsumeInput = {
  userId: string;
  requestId: string;
  callId: string;
  argsHash: string;
  toolName: string;
  installId: string | null;
  serverId: string | null;
  now: Date;
};

/** What the invoke path learns before it runs its consent gate. */
export type ConsentReview = {
  /** The user said yes to exactly this call and the approval was spent just now. */
  redeemed: boolean;
  /** A grant the gate's own rules do not know about: "for this chat", or a confirmed DESTRUCTIVE standing grant. */
  extraGrant: boolean;
  /** Set when the user already said no (or the question timed out): the call must not run or ask again. */
  refusal: InvokeErrorCode | null;
};

/** The prisma row shapes before their enum strings are mapped to the service enums. */
export type RequestDbRow = Omit<ConsentRequestRow, 'riskLevel' | 'status' | 'choice'> & {
  riskLevel: `${RiskLevel}`;
  status: `${ConsentRequestState}`;
  choice: `${ConsentChoiceKind}` | null;
};

export type GrantDbRow = Omit<ChatGrantRow, 'riskLevel'> & { riskLevel: `${RiskLevel}` };
