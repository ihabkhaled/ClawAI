import type { UserAppearancePreference, UserLanguagePreference } from '@/enums';

export type UpdatePreferencesRequest = {
  languagePreference?: UserLanguagePreference;
  appearancePreference?: UserAppearancePreference;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
