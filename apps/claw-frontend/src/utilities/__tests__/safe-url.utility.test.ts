import { describe, expect, it } from 'vitest';

import { isSafeHref, toSafeHref } from '../safe-url.utility';

describe('safe-url.utility', () => {
  describe('allows what a real link needs', () => {
    it.each([
      'https://example.com/page',
      'http://example.com',
      'mailto:someone@example.com',
      'tel:+15551234567',
      '/docs/guide',
      'docs/guide',
      '#section',
      '?tab=two',
    ])('accepts %s', (href) => {
      expect(isSafeHref(href)).toBe(true);
    });
  });

  describe('refuses script-bearing schemes', () => {
    // These are the payloads a stored-XSS attempt actually uses. The content is
    // a chat message anybody could have written, rendered on a page served from
    // our own origin, so a miss here is script execution for every visitor.
    it.each([
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'blob:https://example.com/uuid',
      'jAvAsCrIpT:alert(1)',
    ])('rejects %s', (href) => {
      expect(isSafeHref(href)).toBe(false);
    });

    it.each([
      ['newline inside the scheme', 'java\nscript:alert(1)'],
      ['tab inside the scheme', 'java\tscript:alert(1)'],
      ['carriage return inside the scheme', 'java\rscript:alert(1)'],
      ['NUL inside the scheme', 'java\u0000script:alert(1)'],
      ['leading control character', '\u0001javascript:alert(1)'],
    ])('rejects a scheme smuggled past a prefix check via %s', (_label, href) => {
      // Browsers strip these before parsing the scheme, so a naive
      // startsWith('javascript:') check would pass them straight through.
      expect(isSafeHref(href)).toBe(false);
    });
  });

  it('rejects a protocol-relative URL', () => {
    // `//evil.com` is not relative — it is absolute with an inherited scheme, so
    // treating it as a safe same-origin path would be an open redirect.
    expect(isSafeHref('//evil.com/path')).toBe(false);
  });

  it.each([undefined, ''])('rejects %p', (href) => {
    expect(isSafeHref(href)).toBe(false);
  });

  it('rejects a whitespace-only href', () => {
    expect(isSafeHref('   ')).toBe(false);
  });

  it('rejects an unknown scheme rather than guessing', () => {
    // The check is an allow-list: a scheme nobody has vetted is refused, which is
    // what makes a future browser addition safe by default.
    expect(isSafeHref('ftp://example.com')).toBe(false);
    expect(isSafeHref('ws://example.com')).toBe(false);
  });

  describe('toSafeHref', () => {
    it('returns the trimmed href when safe', () => {
      expect(toSafeHref('  https://example.com  ')).toBe('https://example.com');
    });

    it('returns null when unsafe', () => {
      expect(toSafeHref('javascript:alert(1)')).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(toSafeHref(undefined)).toBeNull();
    });
  });
});
