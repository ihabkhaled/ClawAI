import { Injectable, Logger } from '@nestjs/common';

import { DnsLookupAdapter } from '../adapters/dns-lookup.adapter';
import { MAIL_DOMAIN_CHECK_TIMEOUT_MS, NULL_MX_EXCHANGES } from '../constants/anti-abuse.constants';
import { DnsLookupStatus } from '../enums/dns-lookup-status.enum';
import { DnsRecordType } from '../enums/dns-record-type.enum';
import { MailDomainStatus } from '../enums/mail-domain-status.enum';
import { isNullMx } from '../utilities/dns-error.utility';

/**
 * Can this domain receive mail at all? Fails CLOSED only on proof: the name does
 * not exist (NXDOMAIN), it publishes a null MX, or it has no MX and no A/AAAA
 * (RFC 5321 implicit MX). Anything inconclusive, including the whole check
 * running past MAIL_DOMAIN_CHECK_TIMEOUT_MS, is UNKNOWN and allowed.
 */
@Injectable()
export class MailDomainService {
  private readonly logger = new Logger(MailDomainService.name);

  constructor(private readonly dns: DnsLookupAdapter) {}

  async check(domain: string): Promise<MailDomainStatus> {
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<MailDomainStatus>((resolve) => {
      timer = setTimeout(() => resolve(MailDomainStatus.UNKNOWN), MAIL_DOMAIN_CHECK_TIMEOUT_MS);
    });
    try {
      const status = await Promise.race([this.resolve(domain), deadline]);
      this.logger.debug(`check: ${domain} -> ${status}`);
      return status;
    } finally {
      clearTimeout(timer);
    }
  }

  private async resolve(domain: string): Promise<MailDomainStatus> {
    const mx = await this.dns.lookup(domain, DnsRecordType.MX);
    switch (mx.status) {
      case DnsLookupStatus.FOUND:
        return isNullMx(mx.exchanges, NULL_MX_EXCHANGES)
          ? MailDomainStatus.UNDELIVERABLE
          : MailDomainStatus.DELIVERABLE;
      case DnsLookupStatus.NXDOMAIN:
        return MailDomainStatus.UNDELIVERABLE;
      case DnsLookupStatus.UNKNOWN:
        return MailDomainStatus.UNKNOWN;
      case DnsLookupStatus.NO_RECORDS:
        return this.resolveImplicitMx(domain);
    }
  }

  private async resolveImplicitMx(domain: string): Promise<MailDomainStatus> {
    const answers = await Promise.all([
      this.dns.lookup(domain, DnsRecordType.A),
      this.dns.lookup(domain, DnsRecordType.AAAA),
    ]);
    if (answers.some((answer) => answer.status === DnsLookupStatus.FOUND)) {
      return MailDomainStatus.DELIVERABLE;
    }
    return answers.some((answer) => answer.status === DnsLookupStatus.UNKNOWN)
      ? MailDomainStatus.UNKNOWN
      : MailDomainStatus.UNDELIVERABLE;
  }
}
