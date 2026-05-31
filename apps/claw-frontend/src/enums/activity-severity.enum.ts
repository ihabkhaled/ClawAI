/**
 * Severity bucket for an agent activity / capability invocation entry,
 * used to drive icon + accent token color in the activity log.
 *
 * Mapped from CapabilityInvocationStatus by mapStatusToSeverity().
 */
export enum ActivitySeverity {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  INFO = 'INFO',
}
