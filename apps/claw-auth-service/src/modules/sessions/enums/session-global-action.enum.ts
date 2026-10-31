/** The two dangerous system-wide actions, each behind the two-step guard (ADR-204). */
export enum SessionGlobalAction {
  TERMINATE_ALL = 'TERMINATE_ALL',
  CLEAR_ALL_LOGS = 'CLEAR_ALL_LOGS',
}
