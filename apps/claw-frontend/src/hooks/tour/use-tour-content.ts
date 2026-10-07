import { TOURS_CONTENT_BY_LOCALE } from '@/constants/tours-content.constants';
import { Locale } from '@/enums/locale.enum';
import { useTranslation } from '@/lib/i18n';
import type { TourDictionary } from '@/types/tour.types';

/** The tour copy for the language the person is reading the site in. */
export function useTourContent(): TourDictionary {
  const { locale } = useTranslation();
  // A locale with no copy reads in English rather than breaking the page around the tour.
  return TOURS_CONTENT_BY_LOCALE[locale] ?? TOURS_CONTENT_BY_LOCALE[Locale.EN];
}
