import { type SortOrder, type UserRole, type UserStatus } from '../../../common/enums';

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

/**
 * `GET /internal/users/:id/speech-preferences` — what chat-service needs to
 * read a reply aloud in the user's voice. Nothing else of the profile.
 */
export type UserSpeechPreferences = {
  ttsVoice: string | null;
};

/**
 * `GET /internal/users/:id/identity` — the display name audit-service snapshots
 * onto a feedback ticket so triage can read who wrote it without a lookup later.
 */
export type UserIdentity = {
  firstName: string | null;
  lastName: string | null;
};

/**
 * `POST /internal/users/public-profiles` and `GET /internal/users/by-username/:username` - the only
 * part of a profile another service may show to other people (threads-service comments). Never an
 * email, phone, role or status.
 */
/** The columns the public-profile lookups read: a name and an id, nothing private. */
export type PublicProfileSource = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
};

export type PublicProfile = {
  id: string;
  username: string;
  /** First and last name when set, otherwise the username. */
  displayName: string;
};

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  isSuperAdmin: boolean;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  languagePreference: string;
  appearancePreference: string;
  // Display currency. Presentation state - it never affects an entitlement,
  // a charge or an invoice.
  currencyPreferenceMode: string;
  preferredCountryCode: string | null;
  preferredCurrencyCode: string | null;
  // "Read aloud" voice; null = each provider's default.
  ttsVoice: string | null;
  activePlanId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  planId?: string;
  verification?: 'VERIFIED' | 'UNVERIFIED';
  passwordHash?: string;
  mustChangePassword?: boolean;
  emailVerifiedAt?: Date | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  planId?: string;
  verification?: 'VERIFIED' | 'UNVERIFIED';
}

export interface ListUsersQuery {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy: string;
  sortOrder: SortOrder;
}
