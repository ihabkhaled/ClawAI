import { Resolver } from 'node:dns/promises';
import { Injectable, Logger } from '@nestjs/common';

import {
  DNS_RESOLVER_TRIES,
  MAIL_DOMAIN_CHECK_TIMEOUT_MS,
} from '../constants/anti-abuse.constants';
import { DnsLookupStatus } from '../enums/dns-lookup-status.enum';
import { DnsRecordType } from '../enums/dns-record-type.enum';
import type { DnsLookupResult } from '../types/anti-abuse-counter.types';
import { classifyDnsError } from '../utilities/dns-error.utility';

/**
 * One DNS query, never throwing. The resolver uses the container's configured
 * servers with a per-query timeout and a single try, so a slow resolver costs a
 * sign-up at most the mail-domain budget, which the caller also enforces.
 */
@Injectable()
export class DnsLookupAdapter {
  private readonly logger = new Logger(DnsLookupAdapter.name);
  private readonly resolver = new Resolver({
    timeout: MAIL_DOMAIN_CHECK_TIMEOUT_MS,
    tries: DNS_RESOLVER_TRIES,
  });

  async lookup(domain: string, type: DnsRecordType): Promise<DnsLookupResult> {
    this.logger.debug(`lookup: ${type} ${domain}`);
    try {
      const exchanges = await this.query(domain, type);
      return {
        status: exchanges.length > 0 ? DnsLookupStatus.FOUND : DnsLookupStatus.NO_RECORDS,
        exchanges,
      };
    } catch (error: unknown) {
      const status = classifyDnsError(error);
      if (status === DnsLookupStatus.UNKNOWN) {
        this.logger.warn(
          `lookup: ${type} ${domain} inconclusive (${error instanceof Error ? error.message : 'unknown'})`,
        );
      }
      return { status, exchanges: [] };
    }
  }

  /** MX answers return their exchanges; A/AAAA return addresses (only their count matters). */
  private async query(domain: string, type: DnsRecordType): Promise<string[]> {
    switch (type) {
      case DnsRecordType.MX:
        return (await this.resolver.resolveMx(domain)).map((record) => record.exchange);
      case DnsRecordType.A:
        return this.resolver.resolve4(domain);
      case DnsRecordType.AAAA:
        return this.resolver.resolve6(domain);
    }
  }
}
