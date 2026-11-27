/** How the "Sign-up protection" page edits and validates one setting. */
export enum SecuritySettingKind {
  /** Plain text, shown as stored (a public site key). */
  TEXT = 'TEXT',
  /** Write-only: never shown, only replaced. */
  SECRET = 'SECRET',
  /** A whole number inside the field's range. */
  INTEGER = 'INTEGER',
  /** A decimal score between 0 and 1. */
  SCORE = 'SCORE',
  /** A comma-separated list of email domains. */
  DOMAIN_LIST = 'DOMAIN_LIST',
}
