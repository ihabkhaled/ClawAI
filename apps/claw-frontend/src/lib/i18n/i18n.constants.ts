import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import type { LocaleConfig } from '@/types/i18n.types';

export const DEFAULT_LOCALE = Locale.EN;

export const LOCALE_STORAGE_KEY = 'claw-locale';

export const RTL_LOCALES: ReadonlyArray<Locale> = [Locale.AR, Locale.FA];

export const SUPPORTED_LOCALES: ReadonlyArray<LocaleConfig> = [
  { locale: Locale.EN, label: 'English', shortLabel: 'EN', dir: Direction.LTR },
  { locale: Locale.AR, label: 'العربية', shortLabel: 'ع', dir: Direction.RTL },
  { locale: Locale.FR, label: 'Français', shortLabel: 'FR', dir: Direction.LTR },
  { locale: Locale.IT, label: 'Italiano', shortLabel: 'IT', dir: Direction.LTR },
  { locale: Locale.DE, label: 'Deutsch', shortLabel: 'DE', dir: Direction.LTR },
  { locale: Locale.ES, label: 'Español', shortLabel: 'ES', dir: Direction.LTR },
  { locale: Locale.RU, label: 'Русский', shortLabel: 'RU', dir: Direction.LTR },
  { locale: Locale.PT, label: 'Português', shortLabel: 'PT', dir: Direction.LTR },
  { locale: Locale.HI, label: 'हिन्दी', shortLabel: 'हि', dir: Direction.LTR },
  { locale: Locale.JA, label: '日本語', shortLabel: '日', dir: Direction.LTR },
  { locale: Locale.TH, label: 'ไทย', shortLabel: 'ท', dir: Direction.LTR },
  { locale: Locale.FA, label: 'فارسی', shortLabel: 'ف', dir: Direction.RTL },
  { locale: Locale.ZH, label: '简体中文', shortLabel: '中', dir: Direction.LTR },
];
