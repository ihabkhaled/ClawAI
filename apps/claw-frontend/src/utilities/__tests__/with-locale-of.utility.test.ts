import { describe, expect, it } from 'vitest';

import { withLocaleOf } from '@/utilities/locale.utility';

describe('withLocaleOf', () => {
  it.each(['ar', 'ja', 'de'])(
    'puts a bare path under the locale of the current page (%s)',
    (locale) => {
      expect(withLocaleOf('/settings/change-password', `/${locale}/login`)).toBe(
        `/${locale}/settings/change-password`,
      );
    },
  );

  it('keeps a query string', () => {
    expect(withLocaleOf('/chat?x=1', '/fa/login')).toBe('/fa/chat?x=1');
  });

  it('leaves a path alone when the page has no locale or the path names one', () => {
    expect(withLocaleOf('/chat', '/login')).toBe('/chat');
    expect(withLocaleOf('/en/chat', '/ar/login')).toBe('/en/chat');
  });
});
