import { describe, expect, it } from 'vitest';

import { threadLanguageFromParam, threadLanguageName } from '../thread-language-name.utility';

describe('threadLanguageFromParam', () => {
  it('accepts an app language and nothing else', () => {
    expect(threadLanguageFromParam('ar')).toBe('ar');
    expect(threadLanguageFromParam('xx')).toBeNull();
    expect(threadLanguageFromParam('')).toBeNull();
    expect(threadLanguageFromParam(null)).toBeNull();
  });
});

describe('threadLanguageName', () => {
  it('gives a language its own name, or the code when unknown', () => {
    expect(threadLanguageName('de')).toBe('Deutsch');
    expect(threadLanguageName('xx')).toBe('xx');
  });
});
