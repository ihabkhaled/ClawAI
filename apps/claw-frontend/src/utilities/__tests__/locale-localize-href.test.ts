import { describe, expect, it } from 'vitest';

import { localizeHref } from '@/utilities/locale.utility';

describe('localizeHref', () => {
  it.each(['en', 'ar', 'fa', 'ja', 'de'])(
    'puts /%s in front of the sign-in and sign-up paths',
    (locale) => {
      expect(localizeHref('/login', locale)).toBe(`/${locale}/login`);
      expect(localizeHref('/register?returnTo=%2Fthreads%2Fx', locale)).toBe(
        `/${locale}/register?returnTo=%2Fthreads%2Fx`,
      );
    },
  );

  it('replaces a language the path already has instead of stacking two', () => {
    expect(localizeHref('/en/login', 'ar')).toBe('/ar/login');
  });

  it('leaves the path alone when the locale is unknown, never producing /undefined/login', () => {
    expect(localizeHref('/login', undefined)).toBe('/login');
    expect(localizeHref('/login', 'xx')).toBe('/login');
  });
});
