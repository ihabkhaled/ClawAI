import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import type { LocaleConfig } from '@/types/i18n.types';

export const DEFAULT_LOCALE = Locale.EN;

export const LOCALE_STORAGE_KEY = 'claw-locale';

export const RTL_LOCALES: ReadonlyArray<Locale> = [Locale.AR];

export const SUPPORTED_LOCALES: ReadonlyArray<LocaleConfig> = [
  { locale: Locale.EN, label: 'English', dir: Direction.LTR },
  { locale: Locale.AR, label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', dir: Direction.RTL },
  { locale: Locale.FR, label: 'Fran\u00E7ais', dir: Direction.LTR },
  { locale: Locale.IT, label: 'Italiano', dir: Direction.LTR },
  { locale: Locale.DE, label: 'Deutsch', dir: Direction.LTR },
  { locale: Locale.ES, label: 'Espa\u00F1ol', dir: Direction.LTR },
  { locale: Locale.RU, label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', dir: Direction.LTR },
  { locale: Locale.PT, label: 'Portugu\u00EAs', dir: Direction.LTR },
];
