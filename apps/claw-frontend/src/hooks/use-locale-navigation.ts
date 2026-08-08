'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { UseLocaleNavigationReturn } from '@/types/locale-navigation.types';
import { replacePathLocale } from '@/utilities/locale.utility';

export function useLocaleNavigation(): UseLocaleNavigationReturn {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const replaceLocale = useCallback(
    (locale: Locale): void => {
      const query = searchParams.toString();
      const hash = globalThis.location.hash;
      const path = `${pathname}${query === '' ? '' : `?${query}`}${hash}`;
      router.replace(replacePathLocale(path, locale));
      router.refresh();
    },
    [pathname, router, searchParams],
  );

  return { pathname, replaceLocale };
}
