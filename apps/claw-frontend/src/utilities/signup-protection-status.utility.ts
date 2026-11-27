import {
  EMAIL_CHECK_MESSAGE_KEYS,
  EMAIL_CHECK_REASON_MESSAGE_KEYS,
  SECURITY_DEFAULT_PLACEHOLDER_KEY,
  SECURITY_GROUP_CAPTCHA_PROVIDERS,
  SECURITY_KEY_SOURCE_LABEL_KEYS,
  SECURITY_SECRET_PLACEHOLDER_KEYS,
  SECURITY_SETTING_FIELDS,
  SECURITY_SETTING_GROUPS,
  SECURITY_SITE_KEY_FIELDS,
  SECURITY_SITE_KEY_FROM_SERVER_KEY,
} from '@/constants/admin-security-settings.constants';
import { HTTP_STATUS_BAD_REQUEST } from '@/constants/http-status.constants';
import { EmailCheckTone } from '@/enums/email-check-tone.enum';
import { EmailDomainVerdict } from '@/enums/email-domain-verdict.enum';
import { SecurityKeySource } from '@/enums/security-key-source.enum';
import { SecuritySettingGroup } from '@/enums/security-setting-group.enum';
import { SecuritySettingKind } from '@/enums/security-setting-kind.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  CaptchaProviderStatus,
  CaptchaStatusViews,
  EmailCheckOutcome,
  EmailDomainCheckResult,
  EmailDomainToolsViews,
  SecurityCopy,
  SecuritySecretStatus,
  SecuritySettingField,
  SecuritySettingPlaceholders,
  SignupProtectionStatus,
  UseEmailDomainCheckReturn,
} from '@/types/admin-security-settings.types';

/** The provider a field's card reports on; undefined outside the captcha cards or before the status loads. */
function providerStatusFor(
  field: SecuritySettingField,
  status: SignupProtectionStatus | undefined,
): CaptchaProviderStatus | undefined {
  const provider = SECURITY_GROUP_CAPTCHA_PROVIDERS[field.group];
  return provider === undefined || status === undefined ? undefined : status[provider];
}

/**
 * What one empty box shows. A secret says where the secret in force comes from
 * (falling back to the settings row while the status is missing); an empty site
 * key shows the key the server environment supplies; any other field shows its
 * auth-service default.
 */
export function resolveSecuritySettingPlaceholder(
  field: SecuritySettingField,
  isSecretConfigured: boolean,
  status: SignupProtectionStatus | undefined,
): SecurityCopy | null {
  const provider = providerStatusFor(field, status);
  if (field.kind === SecuritySettingKind.SECRET) {
    const fallback = isSecretConfigured ? SecurityKeySource.SETTING : SecurityKeySource.NONE;
    return { key: SECURITY_SECRET_PLACEHOLDER_KEYS[provider?.secretKeySource ?? fallback] };
  }
  if (SECURITY_SITE_KEY_FIELDS.has(field.key)) {
    return provider?.siteKeySource === SecurityKeySource.ENVIRONMENT && provider.siteKey !== null
      ? { key: SECURITY_SITE_KEY_FROM_SERVER_KEY, params: { value: provider.siteKey } }
      : null;
  }
  return field.defaultValue === ''
    ? null
    : { key: SECURITY_DEFAULT_PLACEHOLDER_KEY, params: { value: field.defaultValue } };
}

/** Every field's placeholder, by setting key. */
export function buildSecuritySettingPlaceholders(
  secretStatus: SecuritySecretStatus,
  status: SignupProtectionStatus | undefined,
): SecuritySettingPlaceholders {
  return Object.fromEntries(
    SECURITY_SETTING_FIELDS.map((field) => [
      field.key,
      resolveSecuritySettingPlaceholder(field, secretStatus[field.key] === true, status),
    ]),
  ) as SecuritySettingPlaceholders;
}

/** The On/Off badge and key sources of each captcha card; empty until the status loads. */
export function buildCaptchaStatusViews(
  status: SignupProtectionStatus | undefined,
): CaptchaStatusViews {
  const views: CaptchaStatusViews = {};
  if (status === undefined) {
    return views;
  }
  for (const { group } of SECURITY_SETTING_GROUPS) {
    const provider = SECURITY_GROUP_CAPTCHA_PROVIDERS[group];
    if (provider === undefined) {
      continue;
    }
    const current = status[provider];
    views[group] = {
      active: current.active,
      siteKeySourceKey: SECURITY_KEY_SOURCE_LABEL_KEYS[current.siteKeySource],
      secretKeySourceKey: SECURITY_KEY_SOURCE_LABEL_KEYS[current.secretKeySource],
    };
  }
  return views;
}

/**
 * A count for the page copy: the reader's digit grouping, but Western digits,
 * which is what the rest of this copy uses in every locale.
 */
export function formatSecurityCount(count: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`).format(count);
}

/** The Email domains card's extras: the address check and the built-in list size (once known). */
export function buildEmailDomainToolsViews(
  emailCheck: UseEmailDomainCheckReturn,
  status: SignupProtectionStatus | undefined,
  locale: string,
): EmailDomainToolsViews {
  const builtInCount =
    status === undefined ? null : formatSecurityCount(status.builtInDisposableDomainCount, locale);
  return { [SecuritySettingGroup.EMAIL]: { ...emailCheck, builtInCount } };
}

/**
 * The address check's last answer in plain words. A 400 means the value is
 * neither an address nor a domain; any other failure gets a generic message.
 * A reason this page does not know yet falls back to the verdict alone.
 */
export function describeEmailCheckOutcome(
  result: EmailDomainCheckResult | undefined,
  error: Error | null,
): EmailCheckOutcome | null {
  if (error !== null) {
    const isInvalid = error instanceof ApiClientError && error.status === HTTP_STATUS_BAD_REQUEST;
    return {
      tone: EmailCheckTone.ERROR,
      messageKey: isInvalid ? EMAIL_CHECK_MESSAGE_KEYS.invalid : EMAIL_CHECK_MESSAGE_KEYS.failed,
      domain: null,
    };
  }
  if (result === undefined) {
    return null;
  }
  const isAllowed = result.verdict === EmailDomainVerdict.ALLOWED;
  const reasonKey: string | undefined = EMAIL_CHECK_REASON_MESSAGE_KEYS[result.reason];
  const verdictKey = isAllowed
    ? EMAIL_CHECK_MESSAGE_KEYS.allowed
    : EMAIL_CHECK_MESSAGE_KEYS.blocked;
  return {
    tone: isAllowed ? EmailCheckTone.ALLOWED : EmailCheckTone.BLOCKED,
    messageKey: reasonKey ?? verdictKey,
    domain: result.domain,
  };
}
