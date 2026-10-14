/** Same strings as the Prisma InvocationStatus enum (the audit row's status). */
export enum InvocationState {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  DENIED = 'DENIED',
  CONSENT_DECLINED = 'CONSENT_DECLINED',
  CONSENT_TIMEOUT = 'CONSENT_TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  BLOCKED = 'BLOCKED',
}
