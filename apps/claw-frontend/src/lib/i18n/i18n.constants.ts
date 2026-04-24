import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import type { LocaleConfig } from '@/types/i18n.types';

export const DEFAULT_LOCALE = Locale.EN;

export const LOCALE_STORAGE_KEY = 'claw-locale';

export const RTL_LOCALES: ReadonlyArray<Locale> = [Locale.AR];

export const SUPPORTED_LOCALES: ReadonlyArray<LocaleConfig> = [
  { locale: Locale.EN, label: 'English', dir: Direction.LTR },
  { locale: Locale.AR, label: 'العربية', dir: Direction.RTL },
  { locale: Locale.FR, label: 'Français', dir: Direction.LTR },
  { locale: Locale.IT, label: 'Italiano', dir: Direction.LTR },
  { locale: Locale.DE, label: 'Deutsch', dir: Direction.LTR },
  { locale: Locale.ES, label: 'Español', dir: Direction.LTR },
  { locale: Locale.RU, label: 'Русский', dir: Direction.LTR },
  { locale: Locale.PT, label: 'Português', dir: Direction.LTR },
  { locale: Locale.HI, label: 'हिन्दी', dir: Direction.LTR },
];
