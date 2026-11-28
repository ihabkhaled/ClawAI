import { describe, expect, it } from 'vitest';

import { languageDisplayName, primaryLanguageSubtag } from '@/utilities/language-name.utility';
import { formatLocalList, parseCommaList } from '@/utilities/list-format.utility';
import { researchPlatformDisplayName } from '@/utilities/research-platform-name.utility';

describe('languageDisplayName', () => {
  it("names a language in the reader's language", () => {
    expect(languageDisplayName('es', 'en')).toBe('Spanish');
    expect(languageDisplayName('es', 'de')).toBe('Spanisch');
    expect(languageDisplayName('en', 'fr')).toBe('anglais');
  });

  it('shows a malformed code as received instead of throwing', () => {
    expect(languageDisplayName('not a code!', 'en')).toBe('not a code!');
  });
});

describe('primaryLanguageSubtag', () => {
  it('drops the region and lowercases', () => {
    expect(primaryLanguageSubtag('pt-BR')).toBe('pt');
    expect(primaryLanguageSubtag('EN')).toBe('en');
    expect(primaryLanguageSubtag('zh_Hans')).toBe('zh');
  });
});

describe('parseCommaList', () => {
  it('trims, drops blanks and repeats, and keeps order', () => {
    expect(parseCommaList(' en, ,es,en ')).toEqual(['en', 'es']);
    expect(parseCommaList(['reddit', ' arxiv '])).toEqual(['reddit', 'arxiv']);
  });

  it('reads anything else as an empty list', () => {
    expect(parseCommaList(undefined)).toEqual([]);
    expect(parseCommaList(4)).toEqual([]);
    expect(parseCommaList('')).toEqual([]);
  });
});

describe('formatLocalList', () => {
  it("joins the way the reader's language joins a list", () => {
    expect(formatLocalList(['English', 'Spanish'], 'en')).toBe('English and Spanish');
    expect(formatLocalList(['Englisch', 'Spanisch'], 'de')).toBe('Englisch und Spanisch');
    expect(formatLocalList(['Reddit'], 'en')).toBe('Reddit');
  });
});

describe('researchPlatformDisplayName', () => {
  it('uses the brand name of a seeded platform', () => {
    expect(researchPlatformDisplayName('arxiv')).toBe('arXiv');
    expect(researchPlatformDisplayName('stack-overflow')).toBe('Stack Overflow');
    expect(researchPlatformDisplayName('REDDIT')).toBe('Reddit');
  });

  it('title-cases a slug it does not know', () => {
    expect(researchPlatformDisplayName('local-news-site')).toBe('Local News Site');
  });
});
