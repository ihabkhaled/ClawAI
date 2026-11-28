/** `action` of the structured audit event each abuse decision writes (ADR-233). */
export enum AbuseAuditAction {
  ACCOUNT_AUTO_SUSPENDED = 'account_auto_suspended',
  AUTO_SUSPENSION_LIFTED = 'auto_suspension_lifted',
  ABUSE_THRESHOLD_CROSSED = 'abuse_threshold_crossed',
  ABUSE_EVIDENCE_FLAGGED = 'abuse_evidence_flagged',
  BANNED_DEVICE_MARKED = 'banned_device_marked',
  BANNED_DEVICE_LIFTED = 'banned_device_lifted',
}
