/** The outcome plugin-service reported for one tool call (chat-service `PluginInvokeStatus`). */
export enum PluginCallStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  BLOCKED = 'BLOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}
