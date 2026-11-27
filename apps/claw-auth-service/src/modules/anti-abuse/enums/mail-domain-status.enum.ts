/** What DNS says about a domain's ability to receive mail. UNKNOWN is allowed (fail open). */
export enum MailDomainStatus {
  DELIVERABLE = 'DELIVERABLE',
  UNDELIVERABLE = 'UNDELIVERABLE',
  UNKNOWN = 'UNKNOWN',
}
