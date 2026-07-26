import type { Locale } from '@/enums/locale.enum';

export type UseLocaleNavigationReturn = {
  replaceLocale: (locale: Locale) => void;
};
