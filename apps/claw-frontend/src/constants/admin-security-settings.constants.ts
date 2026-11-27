import { LinkedAccountReason } from '@/enums/linked-account-reason.enum';
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

/** Badge copy for each reason two accounts are linked. */
export const LINKED_ACCOUNT_REASON_LABEL_KEYS: Readonly<Record<LinkedAccountReason, string>> = {
  [LinkedAccountReason.DEVICE]: 'adminSecurity.linkedAccounts.reasonDevice',
  [LinkedAccountReason.DEVICE_ID]: 'adminSecurity.linkedAccounts.reasonDeviceId',
  [LinkedAccountReason.REGISTRATION_IP]: 'adminSecurity.linkedAccounts.reasonRegistrationIp',
};
