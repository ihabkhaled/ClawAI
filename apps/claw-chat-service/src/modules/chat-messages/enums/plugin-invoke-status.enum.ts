/**
 * The outcome plugin-service reports for one tool invocation
 * (`POST /internal/plugins/invoke`). The same strings the plugin service sends.
 */
export enum PluginInvokeStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  BLOCKED = 'BLOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}
