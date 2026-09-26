import type { CurrencyPreferenceMode } from '@claw/shared-types';

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
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  isSuperAdmin?: boolean;
  languagePreference: UserLanguagePreference;
  appearancePreference: UserAppearancePreference;
  // Display currency. Optional because an older auth service omits the columns,
  // and a session without them should render prices in USD rather than fail.
  currencyPreferenceMode?: CurrencyPreferenceMode;
  preferredCountryCode?: string | null;
  preferredCurrencyCode?: string | null;
  // "Read aloud" voice (null = each provider's default). Optional: an older
  // auth service omits it.
  ttsVoice?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: UserRole;
  // DB-resolved effective permissions from the backend (optional for
  // back-compat with any cached pre-flagship session).
  permissions?: Permission[];
  mustChangePassword: boolean;
  isSuperAdmin?: boolean;
  languagePreference: UserLanguagePreference;
  appearancePreference: UserAppearancePreference;
  // Display currency. Optional because an older auth service omits the columns,
  // and a session without them should render prices in USD rather than fail.
  currencyPreferenceMode?: CurrencyPreferenceMode;
  preferredCountryCode?: string | null;
  preferredCurrencyCode?: string | null;
  // "Read aloud" voice (null = each provider's default). Optional: an older
  // auth service omits it.
  ttsVoice?: string | null;
};
