import type { PluginToolRiskLevel } from '@claw/shared-types';

/** Which buttons plugin-service allows on the card for this request. */
export type PluginConsentOptions = {
  allowChat: boolean;
  always: boolean;
  alwaysNeedsConfirmation: boolean;
};

/** The open question plugin-service raised when a tool needed a yes (the `consent` block of an invoke answer). */
export type PluginConsentCard = {
  requestId: string;
  expiresAt: string;
  argsPreview: string;
  options: PluginConsentOptions;
};

/** The call id and approved request that resume a call the user said yes to. */
export type ConsentResume = { callId: string; consentRequestId: string };

export type PluginConsentWaitRequest = {
  userId: string;
  requestId: string;
  waitMs: number;
};

/** The stream frame payload for the card: enough to show it, never the call id or the argument hash. */
export type PluginConsentStreamPayload = {
  requestId: string;
  pluginSlug: string;
  toolName: string;
  toolTitle: string;
  riskLevel: PluginToolRiskLevel;
  argsPreview: string;
  expiresAt: string;
  options: PluginConsentOptions;
  messageId?: string | undefined;
  /** Set on the RESOLVED frame. */
  outcome?: string | undefined;
};
