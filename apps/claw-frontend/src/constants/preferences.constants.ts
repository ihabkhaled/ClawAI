import { UserAppearancePreference, UserLanguagePreference } from '@/enums';

type LanguageOption = {
  value: UserLanguagePreference;
  label: string;
  nativeLabel: string;
};

type AppearanceOption = {
  value: UserAppearancePreference;
  label: string;
  icon?: string;
};

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: UserLanguagePreference.EN, label: 'settings.langEnglish', nativeLabel: 'English' },
  { value: UserLanguagePreference.AR, label: 'settings.langArabic', nativeLabel: 'العربية' },
  { value: UserLanguagePreference.FR, label: 'settings.langFrench', nativeLabel: 'Français' },
  { value: UserLanguagePreference.IT, label: 'settings.langItalian', nativeLabel: 'Italiano' },
  { value: UserLanguagePreference.DE, label: 'settings.langGerman', nativeLabel: 'Deutsch' },
  { value: UserLanguagePreference.ES, label: 'settings.langSpanish', nativeLabel: 'Español' },
  { value: UserLanguagePreference.RU, label: 'settings.langRussian', nativeLabel: 'Русский' },
  { value: UserLanguagePreference.PT, label: 'settings.langPortuguese', nativeLabel: 'Português' },
  { value: UserLanguagePreference.HI, label: 'settings.langHindi', nativeLabel: 'हिन्दी' },
  { value: UserLanguagePreference.JA, label: 'settings.langJapanese', nativeLabel: '日本語' },
  { value: UserLanguagePreference.TH, label: 'settings.langThai', nativeLabel: 'ไทย' },
  { value: UserLanguagePreference.FA, label: 'settings.langPersian', nativeLabel: 'فارسی' },
  {
    value: UserLanguagePreference.ZH,
    label: 'settings.langSimplifiedChinese',
    nativeLabel: '简体中文',
  },
] as const;

export const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  { value: UserAppearancePreference.SYSTEM, label: 'settings.appearanceSystem', icon: 'monitor' },
  { value: UserAppearancePreference.LIGHT, label: 'settings.appearanceLight', icon: 'sun' },
  { value: UserAppearancePreference.DARK, label: 'settings.appearanceDark', icon: 'moon' },
] as const;
