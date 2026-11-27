import { DISPOSABLE_EMAIL_DOMAINS } from '../../constants/anti-abuse.constants';
import {
  domainCandidates,
  extractEmailDomain,
  isDomainListed,
  parseDomainList,
} from '../email-domain.utility';

describe('email-domain utilities', () => {
  it('reads the domain after the last @, lowercased, without a trailing dot', () => {
    expect(extractEmailDomain('Bot@EUploading.com')).toBe('euploading.com');
    expect(extractEmailDomain('"a@b"@mailinator.com.')).toBe('mailinator.com');
    expect(extractEmailDomain('no-at-sign')).toBeNull();
    expect(extractEmailDomain('trailing@')).toBeNull();
  });

  it('walks parent domains but never offers a bare TLD', () => {
    expect(domainCandidates('a.b.mailinator.com')).toEqual([
      'a.b.mailinator.com',
      'b.mailinator.com',
      'mailinator.com',
    ]);
    expect(domainCandidates('com')).toEqual([]);
  });

  it('matches a listed domain and every subdomain of it', () => {
    const listed = new Set(['mailinator.com']);
    expect(isDomainListed('mailinator.com', listed)).toBe(true);
    expect(isDomainListed('x.y.mailinator.com', listed)).toBe(true);
    expect(isDomainListed('notmailinator.com', listed)).toBe(false);
    expect(isDomainListed('mailinator.com.evil.org', listed)).toBe(false);
  });

  it('parses an admin list with commas, spaces, @ and leading dots', () => {
    expect(parseDomainList(' Foo.com, @bar.org ;.baz.net\nqux \n,, ')).toEqual([
      'foo.com',
      'bar.org',
      'baz.net',
    ]);
    expect(parseDomainList(null)).toEqual([]);
    expect(parseDomainList('')).toEqual([]);
  });

  // Incident 2026-11-27: every domain the farm used must be refused.
  it.each([
    'euploading.com',
    'uberip.com',
    'guerrillamailblock.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamail.org',
    'sharklasers.com',
    'mailinator.com',
    'emailnox.live',
    'appolomail.com',
    'scanue.com',
    'jysnk.com',
    'bwmyga.com',
    'temp-mail.org',
    'temp-mail.io',
    '10minutemail.com',
    '10minutemail.net',
  ])('the bundled list covers the farm domain %s', (domain) => {
    expect(isDomainListed(domain, DISPOSABLE_EMAIL_DOMAINS)).toBe(true);
  });

  it.each(['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me'])(
    'does not list the mainstream provider %s',
    (domain) => {
      expect(isDomainListed(domain, DISPOSABLE_EMAIL_DOMAINS)).toBe(false);
    },
  );
});
