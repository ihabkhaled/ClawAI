import { type Mock, vi } from 'vitest';

import { type DnsLookupAdapter } from '../../adapters/dns-lookup.adapter';
import { DnsLookupStatus } from '../../enums/dns-lookup-status.enum';
import { DnsRecordType } from '../../enums/dns-record-type.enum';
import { MailDomainStatus } from '../../enums/mail-domain-status.enum';
import { MailDomainService } from '../mail-domain.service';

const answer = (status: DnsLookupStatus, exchanges: string[] = []): unknown => ({
  status,
  exchanges,
});

describe('MailDomainService', () => {
  let lookup: Mock;
  let service: MailDomainService;

  function dns(byType: Partial<Record<DnsRecordType, unknown>>): void {
    lookup.mockImplementation(async (_domain: string, type: DnsRecordType) =>
      Promise.resolve(byType[type] ?? answer(DnsLookupStatus.NO_RECORDS)),
    );
  }

  beforeEach(() => {
    lookup = vi.fn();
    service = new MailDomainService({ lookup } as unknown as DnsLookupAdapter);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is deliverable with an MX record, without asking for A/AAAA', async () => {
    dns({ [DnsRecordType.MX]: answer(DnsLookupStatus.FOUND, ['mx.example.com']) });
    await expect(service.check('example.com')).resolves.toBe(MailDomainStatus.DELIVERABLE);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('is undeliverable when the domain does not exist (NXDOMAIN)', async () => {
    dns({ [DnsRecordType.MX]: answer(DnsLookupStatus.NXDOMAIN) });
    await expect(service.check('no-such-domain.invalid')).resolves.toBe(
      MailDomainStatus.UNDELIVERABLE,
    );
  });

  it('is undeliverable with a null MX (RFC 7505)', async () => {
    dns({ [DnsRecordType.MX]: answer(DnsLookupStatus.FOUND, ['.']) });
    await expect(service.check('nomail.example')).resolves.toBe(MailDomainStatus.UNDELIVERABLE);
  });

  it('falls back to A/AAAA when there is no MX (implicit MX)', async () => {
    dns({ [DnsRecordType.AAAA]: answer(DnsLookupStatus.FOUND, ['2001:db8::1']) });
    await expect(service.check('a-only.example')).resolves.toBe(MailDomainStatus.DELIVERABLE);
  });

  it('is undeliverable with no MX and no A/AAAA', async () => {
    dns({});
    await expect(service.check('empty.example')).resolves.toBe(MailDomainStatus.UNDELIVERABLE);
  });

  it('is unknown (allowed) on an inconclusive MX answer', async () => {
    dns({ [DnsRecordType.MX]: answer(DnsLookupStatus.UNKNOWN) });
    await expect(service.check('slow.example')).resolves.toBe(MailDomainStatus.UNKNOWN);
  });

  it('is unknown when an A/AAAA query is inconclusive', async () => {
    dns({ [DnsRecordType.A]: answer(DnsLookupStatus.UNKNOWN) });
    await expect(service.check('half.example')).resolves.toBe(MailDomainStatus.UNKNOWN);
  });

  it('is unknown (allowed) when DNS takes longer than 3 seconds', async () => {
    vi.useFakeTimers();
    lookup.mockReturnValue(new Promise<never>(() => {}));
    const pending = service.check('hanging.example');
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toBe(MailDomainStatus.UNKNOWN);
  });
});
