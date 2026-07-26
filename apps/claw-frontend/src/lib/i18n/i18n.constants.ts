import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import type { LocaleConfig } from '@/types/i18n.types';

export const DEFAULT_LOCALE = Locale.EN;

export const LOCALE_STORAGE_KEY = 'claw-locale';

export const RTL_LOCALES: ReadonlyArray<Locale> = [Locale.AR, Locale.FA];

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
  { locale: Locale.JA, label: '日本語', dir: Direction.LTR },
  { locale: Locale.TH, label: 'ไทย', dir: Direction.LTR },
  { locale: Locale.FA, label: 'فارسی', dir: Direction.RTL },
  { locale: Locale.ZH, label: '简体中文', dir: Direction.LTR },
];
