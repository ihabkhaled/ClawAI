import { Injectable, Logger } from '@nestjs/common';

import { DISPOSABLE_EMAIL_DOMAINS } from '../constants/anti-abuse.constants';
import { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';
import { MailDomainStatus } from '../enums/mail-domain-status.enum';
import { extractEmailDomain, isDomainListed } from '../utilities/email-domain.utility';
import { MailDomainService } from './mail-domain.service';
import { SecuritySettingsService } from './security-settings.service';

/**
 * May this address's domain sign up? In order, subdomains always included:
 * 1. the admin blocklist (`security.email.blockedDomains`) -> DISPOSABLE;
 * 2. the admin allowlist (`security.email.allowedDomains`) -> ALLOWED, skipping
 *    the bundled list AND the DNS check (the operator vouched for it);
 * 3. the bundled disposable list -> DISPOSABLE;
 * 4. DNS: provably undeliverable -> UNDELIVERABLE; inconclusive -> ALLOWED.
 */
@Injectable()
export class EmailDomainPolicyService {
  private readonly logger = new Logger(EmailDomainPolicyService.name);

  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly mailDomain: MailDomainService,
  ) {}

  async evaluate(email: string): Promise<EmailDomainVerdict> {
    const domain = extractEmailDomain(email);
    if (domain === null) {
      return EmailDomainVerdict.ALLOWED;
    }
    const { blockedDomains, allowedDomains } = await this.settings.resolve();
    if (isDomainListed(domain, new Set(blockedDomains))) {
      return EmailDomainVerdict.DISPOSABLE;
    }
    if (isDomainListed(domain, new Set(allowedDomains))) {
      return EmailDomainVerdict.ALLOWED;
    }
    if (isDomainListed(domain, DISPOSABLE_EMAIL_DOMAINS)) {
      return EmailDomainVerdict.DISPOSABLE;
    }
    const status = await this.mailDomain.check(domain);
    this.logger.debug(`evaluate: domain=${domain} mail=${status}`);
    return status === MailDomainStatus.UNDELIVERABLE
      ? EmailDomainVerdict.UNDELIVERABLE
      : EmailDomainVerdict.ALLOWED;
  }
}
