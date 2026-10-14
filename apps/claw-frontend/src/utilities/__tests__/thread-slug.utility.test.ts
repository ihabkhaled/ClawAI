import { describe, expect, it } from 'vitest';

import {
  decodeThreadSlugParam,
  encodeThreadSlug,
  isThreadSlugSegment,
  isValidThreadSlug,
  threadCanonicalUrl,
  threadLocalePath,
} from '@/utilities/thread-slug.utility';

const SLUGS = {
  latin: 'why-is-the-sky-blue-a1b2c3d4',
  arabic: 'كيف-يعمل-التمثيل-الضوئي-a1b2c3d4',
  persian: 'فتوسنتز-در-گیاهان-a1b2c3d4',
  hindi: 'प्रकाश-संश्लेषण-कैसे-a1b2c3d4',
  japanese: '茶道-入門-ガイド-a1b2c3d4',
  thai: 'ปัญญาประดิษฐ์ในการศึกษา-a1b2c3d4',
  tamil: 'செயற்கை-நுண்ணறிவு-a1b2c3d4',
  bengali: 'কৃত্রিম-বুদ্ধিমত্তা-a1b2c3d4',
  hebrew: 'בִּינָה-מְלָאכוּתִית-a1b2c3d4',
  arabicHarakat: 'الذَّكَاءُ-الِاصْطِنَاعِيُّ-a1b2c3d4',
  longestIssued: `${'क'.repeat(60)}-a1b2c3d4`,
} as const;

describe('thread slug validation', () => {
  it.each(Object.entries(SLUGS))('accepts a %s slug', (_name, slug) => {
    expect(isValidThreadSlug(slug)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['a path', 'a/b'],
    ['a dot segment', '..'],
    ['a space', 'a b'],
    ['an underscore', 'a_b'],
    ['a query', 'a?b=1'],
    ['too long', 'a'.repeat(97)],
  ])('rejects %s', (_name, slug) => {
    expect(isValidThreadSlug(slug)).toBe(false);
  });
});

describe('decodeThreadSlugParam', () => {
  it.each(Object.entries(SLUGS))(
    'turns the encoded %s route param back into the slug',
    (_n, slug) => {
      expect(decodeThreadSlugParam(encodeURIComponent(slug))).toBe(slug);
    },
  );

  it('passes an already-plain slug through', () => {
    expect(decodeThreadSlugParam(SLUGS.arabic)).toBe(SLUGS.arabic);
  });

  it('normalises to NFC so a decomposed slug finds the stored one', () => {
    const decomposed = 'café-a1b2c3d4';
    expect(decodeThreadSlugParam(encodeURIComponent(decomposed))).toBe('café-a1b2c3d4');
  });

  it.each(['%E0%A4%A', '%', '%2e%2e', '%2F', 'a%20b'])('returns null for %s', (param) => {
    expect(decodeThreadSlugParam(param)).toBeNull();
  });
});

describe('encoding a slug into a link', () => {
  it('encodes one segment and round-trips', () => {
    for (const slug of Object.values(SLUGS)) {
      const segment = encodeThreadSlug(slug);
      expect(segment).toMatch(/^[A-Za-z0-9%-]+$/u);
      expect(decodeThreadSlugParam(segment)).toBe(slug);
    }
  });

  it('keeps a plain slug readable', () => {
    expect(encodeThreadSlug(SLUGS.latin)).toBe(SLUGS.latin);
  });

  it('never leaves a dot-segment or a path separator', () => {
    expect(encodeThreadSlug('..')).toBe('%2E%2E');
    expect(encodeThreadSlug('a/b')).toBe('a%2Fb');
  });

  it('builds the canonical and the in-page address in the same encoded form', () => {
    const encoded = encodeThreadSlug(SLUGS.arabic);
    expect(threadCanonicalUrl('https://claw-ai.co', 'ar', SLUGS.arabic)).toBe(
      `https://claw-ai.co/ar/threads/${encoded}`,
    );
    expect(threadLocalePath('ar', SLUGS.arabic)).toBe(`/ar/threads/${encoded}`);
  });
});

describe('isThreadSlugSegment', () => {
  it('accepts encoded and plain non-Latin segments', () => {
    expect(isThreadSlugSegment(encodeURIComponent(SLUGS.japanese))).toBe(true);
    expect(isThreadSlugSegment(SLUGS.hindi)).toBe(true);
  });

  it('rejects malformed encoding', () => {
    expect(isThreadSlugSegment('%E0%A4%A')).toBe(false);
  });
});
