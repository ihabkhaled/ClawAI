import type { TokenPair } from './token-session.types';

export type { TokenPair } from './token-session.types';

export interface AuthUserSummary {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  // Effective permissions resolved from the user's role grants (DB-backed).
  permissions: string[];
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  languagePreference: string;
  appearancePreference: string;
}

export interface LoginResult {
  tokens: TokenPair;
  user: AuthUserSummary;
}

// What the manager hands back once the account and its plan both exist.
export interface RegisteredAccount {
  user: AuthUserSummary;
  verificationRequired: true;
}

// What the endpoint returns. `verificationEmailSent: false` means the account
// is real and complete but the confirmation email could not be sent; the web
// client says so on /check-email, where the resend button is the remedy.
export interface RegisterResult extends RegisteredAccount {
  verificationEmailSent: boolean;
}

export interface RefreshResult {
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  status: string;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  languagePreference: string;
  appearancePreference: string;
  // Display currency. Presentation state only — it never affects an
  // entitlement, a permission, a charge or an invoice.
  currencyPreferenceMode: string;
  preferredCountryCode: string | null;
  preferredCurrencyCode: string | null;
  // "Read aloud" voice; null = each provider's default.
  ttsVoice: string | null;
  createdAt: Date;
}
