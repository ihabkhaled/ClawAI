import { type SortOrder, type UserRole, type UserStatus } from '../../../common/enums';

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

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
