import type {
  Permission,
  UserAppearancePreference,
  UserLanguagePreference,
  UserRole,
  UserStatus,
} from '@/enums';

export type User = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  isSuperAdmin?: boolean;
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
  // DB-resolved effective permissions from the backend (optional for
  // back-compat with any cached pre-flagship session).
  permissions?: Permission[];
  mustChangePassword: boolean;
  isSuperAdmin?: boolean;
  languagePreference: UserLanguagePreference;
  appearancePreference: UserAppearancePreference;
};
