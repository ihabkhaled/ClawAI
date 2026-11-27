/** What a sign-up with an email domain would get (GET /admin/security/sign-up/email-check). */
export enum EmailDomainVerdict {
  ALLOWED = 'ALLOWED',
  /** Refused as a throwaway address (built-in list or the admin's blocked list). */
  DISPOSABLE = 'DISPOSABLE',
  /** Refused because the domain cannot receive mail. */
  UNDELIVERABLE = 'UNDELIVERABLE',
}
