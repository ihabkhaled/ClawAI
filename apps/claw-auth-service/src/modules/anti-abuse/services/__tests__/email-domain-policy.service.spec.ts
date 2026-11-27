import { type Mock, vi } from 'vitest';

import { EmailDomainVerdict } from '../../enums/email-domain-verdict.enum';
import { MailDomainStatus } from '../../enums/mail-domain-status.enum';
import { EmailDomainPolicyService } from '../email-domain-policy.service';
import { type MailDomainService } from '../mail-domain.service';
import { type SecuritySettingsService } from '../security-settings.service';

describe('EmailDomainPolicyService', () => {
  let resolve: Mock;
  let check: Mock;
  let service: EmailDomainPolicyService;

  function lists(blockedDomains: string[], allowedDomains: string[]): void {
    resolve.mockResolvedValue({ blockedDomains, allowedDomains });
  }

  beforeEach(() => {
    resolve = vi.fn();
    lists([], []);
    check = vi.fn().mockResolvedValue(MailDomainStatus.DELIVERABLE);
    service = new EmailDomainPolicyService(
      { resolve } as unknown as SecuritySettingsService,
      { check } as unknown as MailDomainService,
    );
  });

  it('refuses a bundled disposable domain without a DNS query', async () => {
    await expect(service.evaluate('bot@euploading.com')).resolves.toBe(
      EmailDomainVerdict.DISPOSABLE,
    );
    expect(check).not.toHaveBeenCalled();
  });

  it('refuses a subdomain of a bundled disposable domain', async () => {
    await expect(service.evaluate('bot@inbox.mailinator.com')).resolves.toBe(
      EmailDomainVerdict.DISPOSABLE,
    );
  });

  it('refuses an admin-blocked domain and its subdomains', async () => {
    lists(['spam-co.example'], []);
    await expect(service.evaluate('x@mx.spam-co.example')).resolves.toBe(
      EmailDomainVerdict.DISPOSABLE,
    );
  });

  it('lets an admin allow-list override the bundled list and skip DNS', async () => {
    lists([], ['mailinator.com']);
    await expect(service.evaluate('qa@mailinator.com')).resolves.toBe(EmailDomainVerdict.ALLOWED);
    expect(check).not.toHaveBeenCalled();
  });

  it('keeps an admin block above an admin allow for the same domain', async () => {
    lists(['corp.example'], ['corp.example']);
    await expect(service.evaluate('a@corp.example')).resolves.toBe(EmailDomainVerdict.DISPOSABLE);
  });

  it('refuses a domain DNS proves undeliverable', async () => {
    check.mockResolvedValue(MailDomainStatus.UNDELIVERABLE);
    await expect(service.evaluate('a@no-such-domain.example')).resolves.toBe(
      EmailDomainVerdict.UNDELIVERABLE,
    );
    expect(check).toHaveBeenCalledWith('no-such-domain.example');
  });

  it('allows a domain when DNS is inconclusive (timeout = allow)', async () => {
    check.mockResolvedValue(MailDomainStatus.UNKNOWN);
    await expect(service.evaluate('a@slow.example')).resolves.toBe(EmailDomainVerdict.ALLOWED);
  });

  it('allows an ordinary mailbox', async () => {
    await expect(service.evaluate('Jane@Gmail.com')).resolves.toBe(EmailDomainVerdict.ALLOWED);
    expect(check).toHaveBeenCalledWith('gmail.com');
  });
});
