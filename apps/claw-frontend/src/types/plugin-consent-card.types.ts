import type { PluginConsentChoice, PluginConsentStatus } from '@/enums/plugin-consent-card.enum';
import type { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';

/** Which buttons plugin-service allows for this request. */
export type PluginConsentOptions = {
  allowChat: boolean;
  always: boolean;
  alwaysNeedsConfirmation: boolean;
};

/** One open question, as `GET /plugins/consent-requests` returns it. The arguments are already redacted and cut. */
export type PluginConsentRequestView = {
  id: string;
  pluginSlug: string;
  pluginName: string;
  toolName: string;
  toolTitle: string;
  riskLevel: PluginRiskLevel;
  conversationId: string | null;
  messageId: string | null;
  argsPreview: string;
  reason: string;
  status: PluginConsentStatus;
  choice: PluginConsentChoice | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  options: PluginConsentOptions;
};

export type PluginConsentDecisionBody = {
  choice: PluginConsentChoice;
  confirmDestructive?: boolean;
};

/** An "Allow for this chat" grant, listed on the Installed page so it can be revoked. */
export type PluginChatGrantView = {
  id: string;
  conversationId: string;
  pluginSlug: string;
  toolName: string;
  riskLevel: PluginRiskLevel;
  grantedAt: string;
  expiresAt: string;
};

export type PluginConsentCardProps = {
  request: PluginConsentRequestView;
  busy: boolean;
  failed: boolean;
  onDecide: (id: string, body: PluginConsentDecisionBody) => void;
  onExpired: () => void;
};

export type UsePluginConsentCardArgs = {
  request: PluginConsentRequestView;
  onDecide: (id: string, body: PluginConsentDecisionBody) => void;
  onExpired: () => void;
};

export type DecideVariables = { id: string; body: PluginConsentDecisionBody };

export type PluginConsentActionsProps = {
  request: PluginConsentRequestView;
  busy: boolean;
  remaining: number;
  denyRef: React.RefObject<HTMLButtonElement | null>;
  onChoose: (choice: PluginConsentChoice) => void;
};

export type PluginConsentConfirmProps = {
  toolTitle: string;
  busy: boolean;
  confirmRef: React.RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onBack: () => void;
};
