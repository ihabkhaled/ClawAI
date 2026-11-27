/** How the admin address check shows its last outcome. */
export enum EmailCheckTone {
  /** A sign-up with this domain would be accepted. */
  ALLOWED = 'ALLOWED',
  /** A sign-up with this domain would be refused. */
  BLOCKED = 'BLOCKED',
  /** The check itself did not answer (bad value or a failed request). */
  ERROR = 'ERROR',
}
