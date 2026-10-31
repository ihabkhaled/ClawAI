import type { UseFormReturn } from 'react-hook-form';

import type { BanDurationUnit } from '@/enums/ban-duration-unit.enum';
import type { PasswordSetMode } from '@/enums/password-set-mode.enum';
import type { PresenceFilter } from '@/enums/presence-filter.enum';
import type { PresenceState } from '@/enums/presence-state.enum';
import type { AdminUserActor } from '@/types/admin-user-capability.types';
import type { AdminUser } from '@/types/audit.types';
import type { TranslateFunction } from '@/types/i18n.types';

/** Body of `POST /users/:id/ban`. */
export type BanUserRequest = {
  unit: BanDurationUnit;
  /** Required for MINUTES, HOURS and DAYS; absent for LIFETIME. */
  amount?: number;
  reason: string;
};

/** Body of `POST /users/:id/password`. */
export type SetUserPasswordRequest =
  { mode: PasswordSetMode.MANUAL; password: string } | { mode: PasswordSetMode.GENERATE };

/** The generated password is in this body exactly once; MANUAL answers `{}`. */
export type SetUserPasswordResponse = {
  generatedPassword?: string;
};

/** `GET /users/presence-summary`. */
export type PresenceSummary = {
  onlineNow: number;
  active24h: number;
  bannedNow: number;
};

export type PresenceSummaryCardProps = {
  summary: PresenceSummary | undefined;
  activeFilter: PresenceFilter | null;
  onSelectFilter: (filter: PresenceFilter | null) => void;
  t: TranslateFunction;
};

export type UserPresenceDotProps = {
  state: PresenceState;
  t: TranslateFunction;
};

export type BanFormValues = {
  unit: BanDurationUnit;
  amount: number;
  reason: string;
};

export type PasswordFormValues = {
  password: string;
};

/** Who is on screen in the dialogs that act on one account. */
export type AdminUserTarget = {
  id: string;
  username: string;
  email: string;
};

/** What the users table needs to ban, unban and re-key an account. Built by useAdminUserSecurityMutations. */
export type UserSecurityHandlers = {
  /** Resolves true when the server accepted the ban, so the dialog can close. */
  onBan: (userId: string, data: BanUserRequest) => Promise<boolean>;
  onUnban: (userId: string) => void;
  /** Resolves with the server's reply (the generated password, once), or null when it refused. */
  onSetPassword: (
    userId: string,
    data: SetUserPasswordRequest,
  ) => Promise<SetUserPasswordResponse | null>;
  isBanPending: boolean;
  isUnbanPending: boolean;
  isSetPasswordPending: boolean;
};

export type UseUserSecurityDialogStateReturn = {
  detailUser: AdminUser | null;
  openDetail: (user: AdminUser) => void;
  closeDetail: () => void;
  banUser: AdminUser | null;
  openBan: (user: AdminUser) => void;
  closeBan: () => void;
  passwordUser: AdminUser | null;
  openPassword: (user: AdminUser) => void;
  closePassword: () => void;
};

export type UseBanUserFormReturn = {
  form: UseFormReturn<BanFormValues>;
  isTimed: boolean;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
};

export type UseSetPasswordDialogReturn = {
  mode: PasswordSetMode;
  setMode: (mode: PasswordSetMode) => void;
  form: UseFormReturn<PasswordFormValues>;
  /** The server-generated password, held in memory until the dialog closes. Null otherwise. */
  generatedPassword: string | null;
  isDone: boolean;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  reset: () => void;
};

export type BanUserDialogProps = {
  open: boolean;
  user: AdminUser | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (userId: string, data: BanUserRequest) => Promise<boolean>;
  t: TranslateFunction;
};

export type SetPasswordDialogProps = {
  open: boolean;
  user: AdminUser | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (
    userId: string,
    data: SetUserPasswordRequest,
  ) => Promise<SetUserPasswordResponse | null>;
  t: TranslateFunction;
};

export type UserDetailDialogProps = {
  open: boolean;
  user: AdminUser | null;
  planName: string | null;
  locale: string;
  actor: AdminUserActor | null;
  onClose: () => void;
  onEdit: (user: AdminUser) => void;
  onBan: (user: AdminUser) => void;
  onUnban: (userId: string) => void;
  t: TranslateFunction;
};
