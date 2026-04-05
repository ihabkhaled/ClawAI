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
  { value: UserLanguagePreference.EN, label: 'English', nativeLabel: 'English' },
  { value: UserLanguagePreference.AR, label: 'Arabic', nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { value: UserLanguagePreference.FR, label: 'French', nativeLabel: 'Fran\u00E7ais' },
  { value: UserLanguagePreference.IT, label: 'Italian', nativeLabel: 'Italiano' },
  { value: UserLanguagePreference.DE, label: 'German', nativeLabel: 'Deutsch' },
  { value: UserLanguagePreference.ES, label: 'Spanish', nativeLabel: 'Espa\u00F1ol' },
  { value: UserLanguagePreference.RU, label: 'Russian', nativeLabel: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
  { value: UserLanguagePreference.PT, label: 'Portuguese', nativeLabel: 'Portugu\u00EAs' },
] as const;

export const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  { value: UserAppearancePreference.SYSTEM, label: 'System', icon: 'monitor' },
  { value: UserAppearancePreference.LIGHT, label: 'Light', icon: 'sun' },
  { value: UserAppearancePreference.DARK, label: 'Dark', icon: 'moon' },
] as const;
