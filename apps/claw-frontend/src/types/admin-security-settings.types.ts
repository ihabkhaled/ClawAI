import type { LinkedAccountReason } from '@/enums/linked-account-reason.enum';
import type { SecuritySettingGroup } from '@/enums/security-setting-group.enum';
import type { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import type { SecuritySettingKind } from '@/enums/security-setting-kind.enum';
import type { AdminUser } from '@/types/audit.types';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * One row of GET /admin/settings. A write-only secret comes back with
 * `value: ''` and `configured: true`; older rows carry no `configured`.
 */
export type SystemSettingView = {
  key: string;
  value: string;
  updatedAt: string;
  configured?: boolean;
};

/** How the page renders and validates one setting. */
export type SecuritySettingField = {
  key: SecuritySettingKey;
  group: SecuritySettingGroup;
  kind: SecuritySettingKind;
  labelKey: string;
  helpKey: string | null;
  /** What the auth-service uses while no row exists; shown as the placeholder. */
  defaultValue: string;
  min: number | null;
  max: number | null;
};

export type SecuritySettingGroupDefinition = {
  group: SecuritySettingGroup;
  titleKey: string;
  descriptionKey: string;
};

/** One card of the page: its copy and the fields it holds, in order. */
export type SecuritySettingGroupView = {
  definition: SecuritySettingGroupDefinition;
  fields: ReadonlyArray<SecuritySettingField>;
};

/** Typed values by setting key. A secret's value is what the admin typed, never what is stored. */
export type SecuritySettingValues = Record<SecuritySettingKey, string>;

/** Which secrets the server reports as already set. */
export type SecuritySecretStatus = Partial<Record<SecuritySettingKey, boolean>>;

/** An i18n key plus its parameters, for one invalid field. */
export type SecuritySettingError = {
  key: string;
  params?: Record<string, string | number>;
};

export type SecuritySettingErrors = Partial<Record<SecuritySettingKey, SecuritySettingError>>;

/** One PUT the save button sends. */
export type SecuritySettingChange = {
  key: SecuritySettingKey;
  value: string;
};

/** The outcome of saving several keys: which ones the server refused. */
export type SecuritySettingsSaveResult = {
  saved: SecuritySettingKey[];
  failed: SecuritySettingKey[];
};

export type UseSecuritySettingsFormReturn = {
  values: SecuritySettingValues;
  errors: SecuritySettingErrors;
  changes: SecuritySettingChange[];
  setValue: (key: SecuritySettingKey, value: string) => void;
  /** Validates; returns the PUTs to send, or null when a field is invalid. */
  validate: () => SecuritySettingChange[] | null;
};

export type UseSystemSettingsReturn = {
  settings: SystemSettingView[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export type UseSaveSecuritySettingsReturn = {
  save: (changes: SecuritySettingChange[]) => void;
  isSaving: boolean;
};

export type UseAdminSecuritySettingsPageReturn = {
  t: TranslateFunction;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  canEdit: boolean;
  groups: ReadonlyArray<SecuritySettingGroupView>;
  values: SecuritySettingValues;
  errors: SecuritySettingErrors;
  secretStatus: SecuritySecretStatus;
  hasChanges: boolean;
  isSaving: boolean;
  setValue: (key: SecuritySettingKey, value: string) => void;
  save: () => void;
};

export type SecuritySettingsGroupCardProps = {
  group: SecuritySettingGroupView;
  values: SecuritySettingValues;
  errors: SecuritySettingErrors;
  secretStatus: SecuritySecretStatus;
  disabled: boolean;
  onChange: (key: SecuritySettingKey, value: string) => void;
  t: TranslateFunction;
};

export type SecuritySettingInputProps = {
  field: SecuritySettingField;
  value: string;
  error: SecuritySettingError | undefined;
  isSecretConfigured: boolean;
  disabled: boolean;
  onChange: (key: SecuritySettingKey, value: string) => void;
  t: TranslateFunction;
};

/** One account GET /admin/users/:id/linked-accounts returns. */
export type LinkedAccount = {
  id: string;
  email: string;
  status: string;
  bannedAt: string | null;
  createdAt: string;
  reasons: LinkedAccountReason[];
};

export type LinkedAccountsResponse = {
  accounts: LinkedAccount[];
};

export type UseAdminUserLinkedAccountsReturn = {
  accounts: LinkedAccount[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export type UseUserLinkedAccountsDialogStateReturn = {
  linkedAccountsUser: AdminUser | null;
  openLinkedAccounts: (user: AdminUser) => void;
  closeLinkedAccounts: () => void;
};

export type UserLinkedAccountsDialogProps = {
  open: boolean;
  user: AdminUser | null;
  locale: string;
  onClose: () => void;
  t: TranslateFunction;
};

export type UserLinkedAccountsDialogBodyProps = {
  userId: string;
  locale: string;
  t: TranslateFunction;
};

export type LinkedAccountRowProps = {
  account: LinkedAccount;
  locale: string;
  t: TranslateFunction;
};
