import type { Locale } from '@/enums/locale.enum';

export type UseLocaleNavigationReturn = {
  pathname: string;
  replaceLocale: (locale: Locale) => void;
};
