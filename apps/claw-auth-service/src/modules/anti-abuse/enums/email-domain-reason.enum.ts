/** Why an email domain got its verdict; shown on the admin page's address check. */
export enum EmailDomainReason {
  ADMIN_BLOCKED = 'ADMIN_BLOCKED',
  ADMIN_ALLOWED = 'ADMIN_ALLOWED',
  BUILT_IN_LIST = 'BUILT_IN_LIST',
  NO_MAIL_SERVER = 'NO_MAIL_SERVER',
  MAIL_SERVER_FOUND = 'MAIL_SERVER_FOUND',
  MAIL_CHECK_INCONCLUSIVE = 'MAIL_CHECK_INCONCLUSIVE',
}
