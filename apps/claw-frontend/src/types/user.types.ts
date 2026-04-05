import type { UserAppearancePreference, UserLanguagePreference, UserRole, UserStatus } from '@/enums';

export type User = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  languagePreference: UserLanguagePreference;
  appearancePreference: UserAppearancePreference;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  languagePreference: UserLanguagePreference;
  appearancePreference: UserAppearancePreference;
};
