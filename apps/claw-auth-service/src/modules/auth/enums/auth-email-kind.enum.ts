/**
 * Every transactional email the auth service sends to a HUMAN account holder.
 *
 * The deployment-status email is deliberately absent: it goes to the operator
 * mailbox (`CONTACT_EMAIL_TO`), not to a user, so it has no account language to
 * be sent in and stays English on purpose.
 */
export enum AuthEmailKind {
  VERIFICATION = 'VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TEMPORARY_PASSWORD = 'TEMPORARY_PASSWORD',
  EMAIL_CHANGE_OTP = 'EMAIL_CHANGE_OTP',
  EMAIL_CHANGE_CONFIRM = 'EMAIL_CHANGE_CONFIRM',
  EMAIL_CHANGE_COMPLETED = 'EMAIL_CHANGE_COMPLETED',
}
