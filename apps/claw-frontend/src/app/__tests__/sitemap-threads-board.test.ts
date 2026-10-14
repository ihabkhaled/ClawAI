import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes.constants';
import { THREADS_PUBLIC_BOARD_PATH } from '@/constants/thread-board-guest.constants';
import { Locale } from '@/enums/locale.enum';
import { getIndexablePagesForLocale } from '@/utilities/content-registry.utility';
import { localisePath } from '@/utilities/locale.utility';

// The guest board is a real, indexable marketing page; the signed-in member Board is private.
describe('sitemap pages for the Threads boards', () => {
  for (const locale of Object.values(Locale)) {
    it(`lists the public board and never the member Board in ${locale}`, () => {
      const canonicalPaths = getIndexablePagesForLocale(locale).map((page) => page.canonicalPath);

      expect(canonicalPaths).toContain(localisePath(THREADS_PUBLIC_BOARD_PATH, locale));
      for (const path of canonicalPaths) {
        expect(path.endsWith(ROUTES.THREAD_BOARD)).toBe(path.endsWith('/threads/board'));
        expect(path).not.toBe(localisePath(ROUTES.THREAD_BOARD, locale));
      }
    });
  }
});
