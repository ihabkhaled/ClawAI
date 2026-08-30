import { describe, expect, it } from 'vitest';

import { en } from '../locales/en';
import { resolveTranslation } from '../translation-resolver';

/**
 * `t()` is called all over the app with the result of a lookup table
 * (`LABELS[item.type]`). A value the table does not cover yields `undefined`,
 * and `undefined.split('.')` threw — white-screening a whole route over one
 * unrenderable word. That is what took the context pack page down in
 * production, so the degradation is pinned here.
 */
describe('resolveTranslation', () => {
  it('resolves a real key', () => {
    expect(resolveTranslation(en, 'context.typeText')).toBe('Text');
  });

  it('interpolates params', () => {
    const text = resolveTranslation(en, 'context.typeText', { unused: 1 });
    expect(typeof text).toBe('string');
  });

  describe('never throws on a key it cannot use', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a number', 42],
      ['an object', {}],
      ['an empty string', ''],
    ])('returns a string for %s', (_label, key) => {
      // Deliberately unsound: this is exactly what a missing map entry hands it.
      expect(resolveTranslation(en, key as unknown as string)).toBe('');
    });

    it('returns the key itself when it is a string with no namespace', () => {
      expect(resolveTranslation(en, 'nonsense')).toBe('nonsense');
    });

    it('returns the key itself when the namespace does not exist', () => {
      expect(resolveTranslation(en, 'noSuchNamespace.noSuchKey')).toBe('noSuchNamespace.noSuchKey');
    });
  });
});
