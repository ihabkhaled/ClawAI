import {
  CHECKED_DOMAIN_LABEL_PATTERN,
  CHECKED_DOMAIN_MAX_LENGTH,
  CHECKED_DOMAIN_TLD_PATTERN,
  DOMAIN_LIST_SEPARATOR,
} from '../constants/anti-abuse.constants';
import { EmailDomainReason } from '../enums/email-domain-reason.enum';
import { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';
import { MailDomainStatus } from '../enums/mail-domain-status.enum';
import type { EmailDomainExplanation } from '../types/signup-protection.types';

/** The domain after the LAST `@`, trimmed and lowercased; null when there is none. */
export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0) {
    return null;
  }
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/u, '');
  return domain.length > 0 ? domain : null;
}

/**
 * The domain itself and every parent that still has two labels:
 * `a.b.mailinator.com` -> `a.b.mailinator.com`, `b.mailinator.com`, `mailinator.com`.
 * A bare TLD is never a candidate, so listing `com` by mistake blocks nothing.
 */
export function domainCandidates(domain: string): string[] {
  const labels = domain.split('.');
  const candidates: string[] = [];
  for (let start = 0; start <= labels.length - 2; start += 1) {
    candidates.push(labels.slice(start).join('.'));
  }
  return candidates;
}

/** True when the domain, or any parent domain of it, is in the set (subdomains are covered). */
export function isDomainListed(domain: string, listed: ReadonlySet<string>): boolean {
  return domainCandidates(domain).some((candidate) => listed.has(candidate));
}

/**
 * An admin list as stored in SystemSetting: comma, semicolon or whitespace
 * separated, `@example.com` and `.example.com` accepted as `example.com`.
 */
export function parseDomainList(raw: string | null): string[] {
  return (raw ?? '')
    .split(DOMAIN_LIST_SEPARATOR)
    .map((entry) =>
      entry
        .trim()
        .toLowerCase()
        .replace(/^[@.]+/u, ''),
    )
    .filter((entry) => entry.includes('.'));
}

/**
 * The domain an admin typed into the address check: an address (`a@b.com`) or a bare domain (`b.com`,
 * `@b.com`). Null when it is not a plausible host name, so the endpoint answers 400 rather than a DNS query.
 */
export function toCheckedDomain(value: string): string | null {
  const domain = value.includes('@')
    ? extractEmailDomain(value)
    : value.trim().toLowerCase().replace(/\.$/u, '');
  return domain !== null && isPlausibleHostname(domain) ? domain : null;
}

/** Two or more DNS labels, a letters-only top-level label, at most 253 characters. */
function isPlausibleHostname(domain: string): boolean {
  const labels = domain.split('.');
  const topLevel = labels.at(-1) ?? '';
  return (
    domain.length <= CHECKED_DOMAIN_MAX_LENGTH &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        CHECKED_DOMAIN_LABEL_PATTERN.test(label) && !label.startsWith('-') && !label.endsWith('-'),
    ) &&
    CHECKED_DOMAIN_TLD_PATTERN.test(topLevel)
  );
}

/** What a DNS answer means for a domain no list decided: no mail server refuses, anything else allows. */
export function explainMailStatus(
  domain: string,
  status: MailDomainStatus,
): EmailDomainExplanation {
  switch (status) {
    case MailDomainStatus.UNDELIVERABLE:
      return {
        domain,
        verdict: EmailDomainVerdict.UNDELIVERABLE,
        reason: EmailDomainReason.NO_MAIL_SERVER,
      };
    case MailDomainStatus.DELIVERABLE:
      return {
        domain,
        verdict: EmailDomainVerdict.ALLOWED,
        reason: EmailDomainReason.MAIL_SERVER_FOUND,
      };
    case MailDomainStatus.UNKNOWN:
      return {
        domain,
        verdict: EmailDomainVerdict.ALLOWED,
        reason: EmailDomainReason.MAIL_CHECK_INCONCLUSIVE,
      };
  }
}
