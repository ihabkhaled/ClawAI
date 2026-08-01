'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LOCALE_STORAGE_KEY } from '@/lib/i18n/i18n.constants';
import {
  getDirection,
  getHtmlLanguage,
  isSupportedLocale,
  parseLocaleFromPathname,
  replacePathLocale,
} from '@/utilities/locale.utility';

export function useCrossTabLocaleSync(): void {
  const router = useRouter();

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== LOCALE_STORAGE_KEY || !isSupportedLocale(event.newValue)) {
        return;
      }
      const activeLocale = parseLocaleFromPathname(globalThis.location.pathname);
      if (activeLocale === event.newValue) {
        return;
      }
      document.documentElement.lang = getHtmlLanguage(event.newValue);
      document.documentElement.dir = getDirection(event.newValue);
      const currentPath = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
      router.replace(replacePathLocale(currentPath, event.newValue));
    };

    globalThis.addEventListener('storage', handleStorage);
    return (): void => globalThis.removeEventListener('storage', handleStorage);
  }, [router]);
}
