import { describe, expect, it } from 'vitest';

import { readRequestedThreadLanguage } from '@/lib/threads/public-thread-page-data';

describe('readRequestedThreadLanguage', () => {
  it('accepts an app language and nothing else', async () => {
    await expect(readRequestedThreadLanguage(Promise.resolve({ lang: 'ar' }))).resolves.toBe('ar');
    await expect(readRequestedThreadLanguage(Promise.resolve({ lang: 'xx' }))).resolves.toBeNull();
    await expect(readRequestedThreadLanguage(Promise.resolve({ lang: '' }))).resolves.toBeNull();
    await expect(readRequestedThreadLanguage(Promise.resolve({}))).resolves.toBeNull();
    await expect(readRequestedThreadLanguage(undefined)).resolves.toBeNull();
  });

  it('takes the first value when the parameter is repeated', async () => {
    await expect(
      readRequestedThreadLanguage(Promise.resolve({ lang: ['de', 'fr'] })),
    ).resolves.toBe('de');
  });
});
