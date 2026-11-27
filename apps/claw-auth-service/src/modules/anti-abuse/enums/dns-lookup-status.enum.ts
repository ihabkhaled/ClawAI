/** One DNS query's answer, reduced to what the mail-domain check needs. */
export enum DnsLookupStatus {
  FOUND = 'FOUND',
  /** The name exists but has no record of this type (ENODATA). */
  NO_RECORDS = 'NO_RECORDS',
  /** The name does not exist (ENOTFOUND, NXDOMAIN). */
  NXDOMAIN = 'NXDOMAIN',
  /** Timeout, SERVFAIL, refused, or anything else: not evidence either way. */
  UNKNOWN = 'UNKNOWN',
}
