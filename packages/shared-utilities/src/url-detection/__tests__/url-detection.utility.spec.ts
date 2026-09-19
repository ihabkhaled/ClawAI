import { describe, expect, it } from 'vitest';

import { detectUrlsInText } from '../url-detection.utility';

describe('detectUrlsInText', () => {
  describe('explicit http(s) URLs (unchanged behaviour)', () => {
    it('keeps a full https URL', () => {
      expect(detectUrlsInText('read https://example.com/post please')).toEqual([
        'https://example.com/post',
      ]);
    });

    it('strips trailing sentence punctuation', () => {
      expect(detectUrlsInText('see https://example.com/a.')).toEqual(['https://example.com/a']);
    });

    it('refuses a URL carrying credentials', () => {
      expect(detectUrlsInText('https://user:pass@example.com/x')).toEqual([]);
    });

    it('refuses non-web schemes', () => {
      expect(detectUrlsInText('ftp://example.com and javascript:alert(1)')).toEqual([]);
    });
  });

  // The bug: a URL written the way people actually write it was invisible.
  describe('bare domains (no scheme, no www)', () => {
    it('detects a bare domain', () => {
      expect(detectUrlsInText('what is on example.com')).toEqual(['https://example.com/']);
    });

    it('detects a bare domain with a path', () => {
      expect(detectUrlsInText('check example.com/pricing for me')).toEqual([
        'https://example.com/pricing',
      ]);
    });

    it('detects www without a scheme', () => {
      expect(detectUrlsInText('go to www.example.org')).toEqual(['https://www.example.org/']);
    });

    it('detects a subdomain and a two-level country suffix', () => {
      expect(detectUrlsInText('docs.stripe.com and gov.co.uk/x')).toEqual([
        'https://docs.stripe.com/',
        'https://gov.co.uk/x',
      ]);
    });

    it('detects modern tech TLDs', () => {
      expect(detectUrlsInText('try claude.ai and ollama.dev')).toEqual([
        'https://claude.ai/',
        'https://ollama.dev/',
      ]);
    });

    // `.app`, `.sh` and friends are also everyday words after a dot, so a bare
    // one needs a path or a www to count.
    it('detects an identifier-shaped TLD once it has a path or www', () => {
      expect(detectUrlsInText('vercel.app/docs, bun.sh/install, www.shop.store')).toEqual([
        'https://vercel.app/docs',
        'https://bun.sh/install',
        'https://www.shop.store/',
      ]);
    });

    it('detects a .local host so the fetch guard can refuse it by name', () => {
      expect(detectUrlsInText('open claw.local/docs')).toEqual(['https://claw.local/docs']);
    });

    it('detects a domain at the very start and end of the text', () => {
      expect(detectUrlsInText('example.com')).toEqual(['https://example.com/']);
    });

    it('does not duplicate the same site written two ways', () => {
      expect(detectUrlsInText('example.com and https://example.com/')).toEqual([
        'https://example.com/',
      ]);
    });
  });

  // A false positive is not harmless: every detected URL becomes an outbound
  // crawl that is billed and that the model is told it read.
  describe('things that look like domains but are not', () => {
    it.each([
      ['a file name', 'edit main.ts and index.html'],
      ['code extensions that are also country TLDs', 'run script.py, deploy.sh, README.md, lib.rs'],
      ['a version number', 'upgrade to v1.2.3 or 10.4'],
      ['a decimal', 'it costs 3.50 dollars'],
      ['an abbreviation', 'e.g. this, i.e. that'],
      ['a library name', 'I use node.js and vue.js'],
      ['an email address', 'mail ihab@example.com'],
      ['a dotted identifier', 'call user.profile.name'],
      ['object properties', 'read user.id, this.app, app.run and this.store'],
      ['a bare private name with no path', 'set config.local'],
    ])('ignores %s', (_label, text) => {
      expect(detectUrlsInText(text)).toEqual([]);
    });
  });

  it('caps the number of URLs returned', () => {
    const many = Array.from({ length: 30 }, (_, i) => `site${String(i)}.com`).join(' ');
    expect(detectUrlsInText(many, { max: 5 })).toHaveLength(5);
  });
});
