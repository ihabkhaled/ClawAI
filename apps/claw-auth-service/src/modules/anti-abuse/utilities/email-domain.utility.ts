import { DOMAIN_LIST_SEPARATOR } from '../constants/anti-abuse.constants';

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
