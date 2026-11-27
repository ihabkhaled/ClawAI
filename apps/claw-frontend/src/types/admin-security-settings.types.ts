import type { FormEvent } from 'react';

import type { CaptchaProvider } from '@/enums/captcha-provider.enum';
import type { EmailCheckTone } from '@/enums/email-check-tone.enum';
import type { EmailDomainReason } from '@/enums/email-domain-reason.enum';
import type { EmailDomainVerdict } from '@/enums/email-domain-verdict.enum';
import type { LinkedAccountReason } from '@/enums/linked-account-reason.enum';
import type { SecurityKeySource } from '@/enums/security-key-source.enum';
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

/** A line of page copy: an i18n key plus its parameters. */
export type SecurityCopy = {
  key: string;
  params?: Record<string, string | number>;
};

/** Per field: what its empty box shows as the placeholder, or null for nothing. */
export type SecuritySettingPlaceholders = Record<SecuritySettingKey, SecurityCopy | null>;

/** One captcha provider as it is in force right now. Never carries a secret. */
export type CaptchaProviderStatus = {
  /** True only when both keys resolve, from this page or the server environment. */
  active: boolean;
  /** The effective (public) site key, or null when none resolves. */
  siteKey: string | null;
  siteKeySource: SecurityKeySource;
  secretKeySource: SecurityKeySource;
};

/**
 * GET /admin/security/sign-up/status: what the settings rows cannot show,
 * because the production keys live in the server environment and the
 * throwaway-domain list is built in. Keyed `turnstile` / `recaptcha`.
 */
export type SignupProtectionStatus = Record<CaptchaProvider, CaptchaProviderStatus> & {
  builtInDisposableDomainCount: number;
};

/** GET /admin/security/sign-up/email-check: the verdict a sign-up with this domain would get, and why. */
export type EmailDomainCheckResult = {
  domain: string;
  verdict: EmailDomainVerdict;
  reason: EmailDomainReason;
};

/** The status line of a Turnstile or reCAPTCHA card. */
export type CaptchaStatusView = {
  active: boolean;
  /** i18n keys naming where each key comes from. */
  siteKeySourceKey: string;
  secretKeySourceKey: string;
};

/** Only the captcha cards have one, and only once the status has loaded. */
export type CaptchaStatusViews = Partial<Record<SecuritySettingGroup, CaptchaStatusView>>;

/** The last answer of the address check, ready to render. */
export type EmailCheckOutcome = {
  tone: EmailCheckTone;
  messageKey: string;
  /** The domain the server checked; null when the check did not answer. */
  domain: string | null;
};

export type UseSignupProtectionStatusReturn = {
  status: SignupProtectionStatus | undefined;
  isError: boolean;
};

export type UseEmailDomainCheckReturn = {
  value: string;
  canSubmit: boolean;
  isChecking: boolean;
  outcome: EmailCheckOutcome | null;
  setValue: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
};

/** What the Email domains card shows below its fields. */
export type EmailDomainToolsView = UseEmailDomainCheckReturn & {
  /** The built-in list size, formatted for the reader; null until the status loads. */
  builtInCount: string | null;
};

/** Only the Email domains card has one. */
export type EmailDomainToolsViews = Partial<Record<SecuritySettingGroup, EmailDomainToolsView>>;

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

/** Reloads everything a security.* write changes: the rows, what is in force, address checks. */
export type InvalidateSecuritySettings = () => void;

export type UseRemoveSecuritySecretReturn = {
  /** PUTs an empty value for one saved secret; the server's key (if any) then takes over. */
  removeSecret: (key: SecuritySettingKey) => void;
  /** The secret being removed right now, or null. */
  removingKey: SecuritySettingKey | null;
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
  placeholders: SecuritySettingPlaceholders;
  captchaStatus: CaptchaStatusViews;
  emailTools: EmailDomainToolsViews;
  /** The status endpoint failed: the cards then show only what the settings rows say. */
  isStatusUnavailable: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  setValue: (key: SecuritySettingKey, value: string) => void;
  save: () => void;
  removeSecret: (key: SecuritySettingKey) => void;
  removingSecretKey: SecuritySettingKey | null;
};

export type SecuritySettingsGroupCardProps = {
  group: SecuritySettingGroupView;
  values: SecuritySettingValues;
  errors: SecuritySettingErrors;
  secretStatus: SecuritySecretStatus;
  placeholders: SecuritySettingPlaceholders;
  captchaStatus: CaptchaStatusView | undefined;
  emailTools: EmailDomainToolsView | undefined;
  disabled: boolean;
  /** The admin may change settings, so a secret saved here can be removed. */
  canRemoveSecrets: boolean;
  removingSecretKey: SecuritySettingKey | null;
  onChange: (key: SecuritySettingKey, value: string) => void;
  onRemoveSecret: (key: SecuritySettingKey) => void;
  t: TranslateFunction;
};

export type SecuritySettingInputProps = {
  field: SecuritySettingField;
  value: string;
  error: SecuritySettingError | undefined;
  placeholder: SecurityCopy | null;
  isSecretConfigured: boolean;
  disabled: boolean;
  canRemoveSecret: boolean;
  removingSecretKey: SecuritySettingKey | null;
  onChange: (key: SecuritySettingKey, value: string) => void;
  onRemoveSecret: (key: SecuritySettingKey) => void;
  t: TranslateFunction;
};

export type SecuritySecretRemoveButtonProps = {
  fieldKey: SecuritySettingKey;
  isRemoving: boolean;
  disabled: boolean;
  onRemove: (key: SecuritySettingKey) => void;
  t: TranslateFunction;
};

export type SecurityCaptchaStatusProps = {
  status: CaptchaStatusView;
  testId: string;
  t: TranslateFunction;
};

export type SecurityEmailDomainToolsProps = {
  tools: EmailDomainToolsView;
  t: TranslateFunction;
};

export type SecurityEmailCheckOutcomeProps = {
  outcome: EmailCheckOutcome;
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
