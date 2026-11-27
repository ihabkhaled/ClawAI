import type { DnsLookupStatus } from '../enums/dns-lookup-status.enum';

/** Sign-up velocity: allowed, or refused with the wait the client is told. */
export type VelocityDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** One DNS query. `exchanges` is filled for an MX answer only. */
export type DnsLookupResult = {
  status: DnsLookupStatus;
  exchanges: string[];
};
