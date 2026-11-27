import { Injectable, Logger } from '@nestjs/common';

import { DISPOSABLE_EMAIL_DOMAINS } from '../constants/anti-abuse.constants';
import { EmailDomainReason } from '../enums/email-domain-reason.enum';
import { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';
import type { EmailDomainExplanation } from '../types/signup-protection.types';
import {
  explainMailStatus,
  extractEmailDomain,
  isDomainListed,
} from '../utilities/email-domain.utility';
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
    return domain === null ? EmailDomainVerdict.ALLOWED : (await this.explain(domain)).verdict;
  }

  /** The verdict and the rule that produced it; the admin page's address check shows both. */
  async explain(domain: string): Promise<EmailDomainExplanation> {
    const { blockedDomains, allowedDomains } = await this.settings.resolve();
    if (isDomainListed(domain, new Set(blockedDomains))) {
      return {
        domain,
        verdict: EmailDomainVerdict.DISPOSABLE,
        reason: EmailDomainReason.ADMIN_BLOCKED,
      };
    }
    if (isDomainListed(domain, new Set(allowedDomains))) {
      return {
        domain,
        verdict: EmailDomainVerdict.ALLOWED,
        reason: EmailDomainReason.ADMIN_ALLOWED,
      };
    }
    if (isDomainListed(domain, DISPOSABLE_EMAIL_DOMAINS)) {
      return {
        domain,
        verdict: EmailDomainVerdict.DISPOSABLE,
        reason: EmailDomainReason.BUILT_IN_LIST,
      };
    }
    const status = await this.mailDomain.check(domain);
    this.logger.debug(`explain: domain=${domain} mail=${status}`);
    return explainMailStatus(domain, status);
  }
}
