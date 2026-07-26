import { describe, expect, it } from 'vitest';

import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';

import {
  getHtmlLanguage,
  getLocaleDirection,
  localisePath,
  normalizeBrowserLocale,
  parseLocaleFromPathname,
  replacePathLocale,
} from '../locale.utility';

describe('locale routing utilities', () => {
  it.each([
    ['fa-IR', Locale.FA],
    ['zh-CN', Locale.ZH],
    ['zh-Hans', Locale.ZH],
    ['ja-JP', Locale.JA],
    ['th-TH', Locale.TH],
  ])('normalizes browser locale %s', (input, expected) => {
    expect(normalizeBrowserLocale(input)).toBe(expected);
  });

  it('preserves path, query, and hash while replacing only the locale', () => {
    expect(replacePathLocale('/en/chat/thread-1?mode=compare#result', Locale.JA)).toBe(
      '/ja/chat/thread-1?mode=compare#result',
    );
  });

  it('rejects invalid and encoded locale path segments', () => {
    expect(parseLocaleFromPathname('/zz/features')).toBeNull();
    expect(parseLocaleFromPathname('/en%2Fadmin')).toBeNull();
    expect(parseLocaleFromPathname('/english/features')).toBeNull();
  });

  it('cannot turn a protocol-relative input into an open redirect', () => {
    expect(localisePath('//attacker.example/path', Locale.EN)).toBe('/en');
  });

  it('maps language and direction accurately', () => {
    expect(getLocaleDirection(Locale.FA)).toBe(Direction.RTL);
    expect(getLocaleDirection(Locale.AR)).toBe(Direction.RTL);
    expect(getHtmlLanguage(Locale.ZH)).toBe('zh-Hans');
  });
});
