import { TOURS_CONTENT_BY_LOCALE } from '@/constants/tours-content.constants';
import { useTranslation } from '@/lib/i18n';
import type { TourDictionary } from '@/types/tour.types';

/** The tour copy for the language the person is reading the site in. */
export function useTourContent(): TourDictionary {
  const { locale } = useTranslation();
  return TOURS_CONTENT_BY_LOCALE[locale];
}
