/** The `status` of an invoke answer. CONSENT_REQUIRED is a question, not a result: it is never audited. */
export enum InvokeOutcome {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  BLOCKED = 'BLOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}
