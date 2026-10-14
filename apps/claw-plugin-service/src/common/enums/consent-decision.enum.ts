/** How the consent rule came out for one call. The value is stored on the audit row. */
export enum ConsentDecision {
  NOT_REQUIRED = 'NOT_REQUIRED',
  APPROVED_THIS_CALL = 'APPROVED_THIS_CALL',
  STORED_GRANT = 'STORED_GRANT',
  REQUIRED_FIRST_USE = 'REQUIRED_FIRST_USE',
  REQUIRED_EVERY_CALL = 'REQUIRED_EVERY_CALL',
  REQUIRED_TAINTED = 'REQUIRED_TAINTED',
}
