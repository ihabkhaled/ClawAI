import { DNS_NO_DATA_CODE, DNS_NXDOMAIN_CODE } from '../constants/anti-abuse.constants';
import { DnsLookupStatus } from '../enums/dns-lookup-status.enum';

/**
 * Only two answers are evidence: the name does not exist (ENOTFOUND) and the
 * name exists without that record type (ENODATA). A timeout, SERVFAIL or refused
 * query says nothing about the domain and must never block a sign-up.
 */
export function classifyDnsError(error: unknown): DnsLookupStatus {
  const code =
    error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === DNS_NXDOMAIN_CODE) {
    return DnsLookupStatus.NXDOMAIN;
  }
  return code === DNS_NO_DATA_CODE ? DnsLookupStatus.NO_RECORDS : DnsLookupStatus.UNKNOWN;
}

/** RFC 7505: one MX whose exchange is the root (`.` or empty) means "accepts no mail". */
export function isNullMx(
  exchanges: readonly string[],
  nullExchanges: ReadonlySet<string>,
): boolean {
  return exchanges.length > 0 && exchanges.every((exchange) => nullExchanges.has(exchange.trim()));
}
