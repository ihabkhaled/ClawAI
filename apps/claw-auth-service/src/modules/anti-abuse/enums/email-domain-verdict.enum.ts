/** Whether an address's domain may sign up. */
export enum EmailDomainVerdict {
  ALLOWED = 'ALLOWED',
  DISPOSABLE = 'DISPOSABLE',
  UNDELIVERABLE = 'UNDELIVERABLE',
}
