import { CaptchaProvider } from '@/enums/captcha-provider.enum';
import { EmailCheckTone } from '@/enums/email-check-tone.enum';
import { EmailDomainReason } from '@/enums/email-domain-reason.enum';
import { LinkedAccountReason } from '@/enums/linked-account-reason.enum';
import { SecurityKeySource } from '@/enums/security-key-source.enum';
import { SecuritySettingGroup } from '@/enums/security-setting-group.enum';
import { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import { SecuritySettingKind } from '@/enums/security-setting-kind.enum';
import type {
  SecuritySettingField,
  SecuritySettingGroupDefinition,
} from '@/types/admin-security-settings.types';

/** Proof-of-work difficulty bounds the auth-service accepts (leading zero bits). */
export const POW_DIFFICULTY_MIN = 12;
export const POW_DIFFICULTY_MAX = 24;

/** Upper bound for the two sign-up velocity numbers; anything higher is no limit at all. */
export const SIGNUP_VELOCITY_MAX = 100_000;

/**
 * One email domain is checked label by label (no nested quantifiers, so no
 * catastrophic backtracking): every label is letters, digits and dashes, never
 * starting or ending with a dash, and the last label is 2+ letters.
 */
export const EMAIL_DOMAIN_LABEL_PATTERN = /^[a-z0-9-]{1,63}$/u;
export const EMAIL_DOMAIN_TLD_PATTERN = /^[a-z]{2,63}$/u;
export const EMAIL_DOMAIN_MAX_LENGTH = 253;

/** The SystemSetting value column holds at most this many characters. */
export const SYSTEM_SETTING_VALUE_MAX_LENGTH = 2048;

/** Every setting the page edits, in render order inside its group. */
export const SECURITY_SETTING_FIELDS: ReadonlyArray<SecuritySettingField> = [
  {
    key: SecuritySettingKey.TURNSTILE_SITE_KEY,
    group: SecuritySettingGroup.TURNSTILE,
    kind: SecuritySettingKind.TEXT,
    labelKey: 'adminSecurity.fields.siteKey',
    helpKey: null,
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.TURNSTILE_SECRET_KEY,
    group: SecuritySettingGroup.TURNSTILE,
    kind: SecuritySettingKind.SECRET,
    labelKey: 'adminSecurity.fields.secretKey',
    helpKey: 'adminSecurity.fields.secretHelp',
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.RECAPTCHA_SITE_KEY,
    group: SecuritySettingGroup.RECAPTCHA,
    kind: SecuritySettingKind.TEXT,
    labelKey: 'adminSecurity.fields.siteKey',
    helpKey: null,
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.RECAPTCHA_SECRET_KEY,
    group: SecuritySettingGroup.RECAPTCHA,
    kind: SecuritySettingKind.SECRET,
    labelKey: 'adminSecurity.fields.secretKey',
    helpKey: 'adminSecurity.fields.secretHelp',
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.RECAPTCHA_MIN_SCORE,
    group: SecuritySettingGroup.RECAPTCHA,
    kind: SecuritySettingKind.SCORE,
    labelKey: 'adminSecurity.fields.minScore',
    helpKey: 'adminSecurity.fields.minScoreHelp',
    defaultValue: '0.5',
    min: 0,
    max: 1,
  },
  {
    key: SecuritySettingKey.POW_DIFFICULTY,
    group: SecuritySettingGroup.POW,
    kind: SecuritySettingKind.INTEGER,
    labelKey: 'adminSecurity.fields.powDifficulty',
    helpKey: 'adminSecurity.fields.powDifficultyHelp',
    defaultValue: '18',
    min: POW_DIFFICULTY_MIN,
    max: POW_DIFFICULTY_MAX,
  },
  {
    key: SecuritySettingKey.EMAIL_BLOCKED_DOMAINS,
    group: SecuritySettingGroup.EMAIL,
    kind: SecuritySettingKind.DOMAIN_LIST,
    labelKey: 'adminSecurity.fields.blockedDomains',
    helpKey: 'adminSecurity.fields.blockedDomainsHelp',
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.EMAIL_ALLOWED_DOMAINS,
    group: SecuritySettingGroup.EMAIL,
    kind: SecuritySettingKind.DOMAIN_LIST,
    labelKey: 'adminSecurity.fields.allowedDomains',
    helpKey: 'adminSecurity.fields.allowedDomainsHelp',
    defaultValue: '',
    min: null,
    max: null,
  },
  {
    key: SecuritySettingKey.SIGNUP_MAX_PER_10_MIN,
    group: SecuritySettingGroup.VELOCITY,
    kind: SecuritySettingKind.INTEGER,
    labelKey: 'adminSecurity.fields.maxPer10Min',
    helpKey: 'adminSecurity.fields.maxPer10MinHelp',
    defaultValue: '30',
    min: 1,
    max: SIGNUP_VELOCITY_MAX,
  },
  {
    key: SecuritySettingKey.SIGNUP_MAX_PER_DEVICE_PER_DAY,
    group: SecuritySettingGroup.VELOCITY,
    kind: SecuritySettingKind.INTEGER,
    labelKey: 'adminSecurity.fields.maxPerDevicePerDay',
    helpKey: 'adminSecurity.fields.maxPerDevicePerDayHelp',
    defaultValue: '3',
    min: 1,
    max: SIGNUP_VELOCITY_MAX,
  },
];

/** The cards, in render order. */
export const SECURITY_SETTING_GROUPS: ReadonlyArray<SecuritySettingGroupDefinition> = [
  {
    group: SecuritySettingGroup.POW,
    titleKey: 'adminSecurity.groups.powTitle',
    descriptionKey: 'adminSecurity.groups.powDescription',
  },
  {
    group: SecuritySettingGroup.TURNSTILE,
    titleKey: 'adminSecurity.groups.turnstileTitle',
    descriptionKey: 'adminSecurity.groups.turnstileDescription',
  },
  {
    group: SecuritySettingGroup.RECAPTCHA,
    titleKey: 'adminSecurity.groups.recaptchaTitle',
    descriptionKey: 'adminSecurity.groups.recaptchaDescription',
  },
  {
    group: SecuritySettingGroup.EMAIL,
    titleKey: 'adminSecurity.groups.emailTitle',
    descriptionKey: 'adminSecurity.groups.emailDescription',
  },
  {
    group: SecuritySettingGroup.VELOCITY,
    titleKey: 'adminSecurity.groups.velocityTitle',
    descriptionKey: 'adminSecurity.groups.velocityDescription',
  },
];

/** Validation copy per kind of setting. */
export const SECURITY_SETTING_ERROR_KEYS = {
  integer: 'adminSecurity.errors.integerRange',
  score: 'adminSecurity.errors.scoreRange',
  domains: 'adminSecurity.errors.domainList',
  tooLong: 'adminSecurity.errors.tooLong',
} as const;

/** Placeholder of a number or list field with an auth-service default. */
export const SECURITY_DEFAULT_PLACEHOLDER_KEY = 'adminSecurity.fields.defaultPlaceholder';

/** Placeholder of an empty site-key box while the server environment supplies the key. */
export const SECURITY_SITE_KEY_FROM_SERVER_KEY = 'adminSecurity.fields.siteKeyFromServer';

/** Which provider's status (GET /admin/security/sign-up/status) each captcha card shows. */
export const SECURITY_GROUP_CAPTCHA_PROVIDERS: Readonly<
  Partial<Record<SecuritySettingGroup, CaptchaProvider>>
> = {
  [SecuritySettingGroup.TURNSTILE]: CaptchaProvider.TURNSTILE,
  [SecuritySettingGroup.RECAPTCHA]: CaptchaProvider.RECAPTCHA,
};

/** The public site-key fields: an empty one shows the key the server is using. */
export const SECURITY_SITE_KEY_FIELDS: ReadonlySet<SecuritySettingKey> = new Set([
  SecuritySettingKey.TURNSTILE_SITE_KEY,
  SecuritySettingKey.RECAPTCHA_SITE_KEY,
]);

/** "Where the key comes from", as shown on a captcha card. */
export const SECURITY_KEY_SOURCE_LABEL_KEYS: Readonly<Record<SecurityKeySource, string>> = {
  [SecurityKeySource.SETTING]: 'adminSecurity.status.sourceSetting',
  [SecurityKeySource.ENVIRONMENT]: 'adminSecurity.status.sourceEnvironment',
  [SecurityKeySource.NONE]: 'adminSecurity.status.sourceNone',
};

/** The placeholder of a write-only secret box, by where the secret in force comes from. */
export const SECURITY_SECRET_PLACEHOLDER_KEYS: Readonly<Record<SecurityKeySource, string>> = {
  [SecurityKeySource.SETTING]: 'adminSecurity.fields.secretConfigured',
  [SecurityKeySource.ENVIRONMENT]: 'adminSecurity.fields.secretFromServer',
  [SecurityKeySource.NONE]: 'adminSecurity.fields.secretNotConfigured',
};

/** The address check's answer in plain words, by the reason the server gives. */
export const EMAIL_CHECK_REASON_MESSAGE_KEYS: Readonly<Record<EmailDomainReason, string>> = {
  [EmailDomainReason.ADMIN_BLOCKED]: 'adminSecurity.emailCheck.adminBlocked',
  [EmailDomainReason.ADMIN_ALLOWED]: 'adminSecurity.emailCheck.adminAllowed',
  [EmailDomainReason.BUILT_IN_LIST]: 'adminSecurity.emailCheck.builtInList',
  [EmailDomainReason.NO_MAIL_SERVER]: 'adminSecurity.emailCheck.noMailServer',
  [EmailDomainReason.MAIL_SERVER_FOUND]: 'adminSecurity.emailCheck.mailServerFound',
  [EmailDomainReason.MAIL_CHECK_INCONCLUSIVE]: 'adminSecurity.emailCheck.mailCheckInconclusive',
};

/** Address-check copy that does not depend on a reason. */
export const EMAIL_CHECK_MESSAGE_KEYS = {
  /** A reason this page does not know yet: fall back to the verdict alone. */
  allowed: 'adminSecurity.emailCheck.allowed',
  blocked: 'adminSecurity.emailCheck.blocked',
  /** 400 VALIDATION_FAILED: the value is neither an address nor a domain. */
  invalid: 'adminSecurity.emailCheck.invalid',
  failed: 'adminSecurity.emailCheck.failed',
} as const;

/** Text colour of the address check's answer. */
export const EMAIL_CHECK_TONE_CLASS_NAMES: Readonly<Record<EmailCheckTone, string>> = {
  [EmailCheckTone.ALLOWED]: 'text-success',
  [EmailCheckTone.BLOCKED]: 'text-destructive',
  [EmailCheckTone.ERROR]: 'text-destructive',
};

/** The longest value GET /admin/security/sign-up/email-check accepts (an email address's maximum). */
export const EMAIL_CHECK_VALUE_MAX_LENGTH = 320;

/** Every Check asks again: the answer depends on the saved settings and on live DNS. */
export const EMAIL_CHECK_STALE_MS = 0;

/** Badge copy for each reason two accounts are linked. */
export const LINKED_ACCOUNT_REASON_LABEL_KEYS: Readonly<Record<LinkedAccountReason, string>> = {
  [LinkedAccountReason.DEVICE]: 'adminSecurity.linkedAccounts.reasonDevice',
  [LinkedAccountReason.DEVICE_ID]: 'adminSecurity.linkedAccounts.reasonDeviceId',
  [LinkedAccountReason.REGISTRATION_IP]: 'adminSecurity.linkedAccounts.reasonRegistrationIp',
};
