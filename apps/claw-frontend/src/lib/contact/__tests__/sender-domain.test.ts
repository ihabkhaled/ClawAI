import { describe, expect, it } from 'vitest';

import { isNonRoutableSenderDomain } from '@/lib/contact/sender-domain';

describe('sender domain routability', () => {
  it.each([
    ['no-reply@claw.local', '.local is reserved for mDNS (RFC 6762)'],
    ['a@localhost', 'reserved by RFC 2606'],
    ['a@sub.localhost', 'reserved, including subdomains'],
    ['a@example.test', 'reserved by RFC 2606'],
    ['a@foo.example', 'reserved by RFC 2606'],
    ['a@thing.invalid', 'reserved by RFC 2606'],
    ['a@bare', 'no dot at all — cannot be a public domain'],
    ['not-an-address', 'no @ at all'],
    ['a@', 'empty domain'],
  ])('rejects %s (%s)', (address) => {
    expect(isNonRoutableSenderDomain(address)).toBe(true);
  });

  it.each([
    'no-reply@claw.ai',
    'ihab.khaled94@gmail.com',
    'support@sub.domain.co.uk',
    'a@localhost.com',
    'a@example.com.mycompany.io',
  ])('accepts the routable address %s', (address) => {
    expect(isNonRoutableSenderDomain(address)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isNonRoutableSenderDomain('No-Reply@CLAW.LOCAL')).toBe(true);
  });

  it('does not reject a domain that merely CONTAINS a reserved word', () => {
    // "localhost.com" and "mytest.com" are ordinary registrable domains; only a
    // reserved TLD (or an exact match) is unroutable.
    expect(isNonRoutableSenderDomain('a@mytest.com')).toBe(false);
    expect(isNonRoutableSenderDomain('a@localdomain.com')).toBe(false);
  });
});
