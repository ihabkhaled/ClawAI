import {
  EMAIL_DOMAIN_LABEL_PATTERN,
  EMAIL_DOMAIN_MAX_LENGTH,
  EMAIL_DOMAIN_TLD_PATTERN,
  SECURITY_SETTING_ERROR_KEYS,
  SECURITY_SETTING_FIELDS,
  SECURITY_SETTING_GROUPS,
  SYSTEM_SETTING_VALUE_MAX_LENGTH,
} from '@/constants/admin-security-settings.constants';
import { SecuritySettingKind } from '@/enums/security-setting-kind.enum';
import type {
  SecuritySecretStatus,
  SecuritySettingChange,
  SecuritySettingError,
  SecuritySettingErrors,
  SecuritySettingField,
  SecuritySettingGroupView,
  SecuritySettingValues,
  SystemSettingView,
} from '@/types/admin-security-settings.types';

/** Domains from a comma (or whitespace) separated list: trimmed, lower-cased, de-duplicated. */
export function parseDomainList(value: string): string[] {
  const domains = value
    .split(/[\s,]+/u)
    .map((domain) => domain.trim().toLowerCase().replace(/^@/u, ''))
    .filter((domain) => domain.length > 0);
  return [...new Set(domains)];
}

/** A plausible email domain: dot-separated labels, no edge dashes, a letters-only TLD. */
export function isValidEmailDomain(domain: string): boolean {
  if (domain.length > EMAIL_DOMAIN_MAX_LENGTH) {
    return false;
  }
  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }
  const tld = labels.at(-1) ?? '';
  return (
    EMAIL_DOMAIN_TLD_PATTERN.test(tld) &&
    labels.every(
      (label) =>
        EMAIL_DOMAIN_LABEL_PATTERN.test(label) && !label.startsWith('-') && !label.endsWith('-'),
    )
  );
}

/** The value as it is stored: trimmed, and a domain list in its canonical `a.com,b.org` form. */
export function normalizeSecuritySettingValue(field: SecuritySettingField, value: string): string {
  if (field.kind === SecuritySettingKind.DOMAIN_LIST) {
    return parseDomainList(value).join(',');
  }
  return value.trim();
}

function validateRange(field: SecuritySettingField, value: string): SecuritySettingError | null {
  const min = field.min ?? 0;
  const max = field.max ?? Number.MAX_SAFE_INTEGER;
  if (field.kind === SecuritySettingKind.INTEGER) {
    const parsed = Number(value);
    return /^\d+$/u.test(value) && parsed >= min && parsed <= max
      ? null
      : { key: SECURITY_SETTING_ERROR_KEYS.integer, params: { min, max } };
  }
  const parsed = Number(value);
  return /^\d+$|^\d*\.\d+$/u.test(value) && parsed >= min && parsed <= max
    ? null
    : { key: SECURITY_SETTING_ERROR_KEYS.score };
}

/**
 * Why a typed value cannot be saved, or null. An empty value is always valid:
 * for a number or list it means "use the default", for a secret "keep it".
 */
export function validateSecuritySetting(
  field: SecuritySettingField,
  value: string,
): SecuritySettingError | null {
  const normalized = normalizeSecuritySettingValue(field, value);
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > SYSTEM_SETTING_VALUE_MAX_LENGTH) {
    return { key: SECURITY_SETTING_ERROR_KEYS.tooLong };
  }
  switch (field.kind) {
    case SecuritySettingKind.INTEGER:
    case SecuritySettingKind.SCORE:
      return validateRange(field, normalized);
    case SecuritySettingKind.DOMAIN_LIST:
      return parseDomainList(normalized).every(isValidEmailDomain)
        ? null
        : { key: SECURITY_SETTING_ERROR_KEYS.domains };
    case SecuritySettingKind.TEXT:
    case SecuritySettingKind.SECRET:
      return null;
  }
}

/**
 * The form's starting values from GET /admin/settings. A secret always starts
 * empty: it is write-only, and the server returns '' for it anyway.
 */
export function buildSecuritySettingValues(
  settings: ReadonlyArray<SystemSettingView>,
): SecuritySettingValues {
  const stored = new Map(settings.map((setting) => [setting.key, setting.value]));
  return Object.fromEntries(
    SECURITY_SETTING_FIELDS.map((field) => [
      field.key,
      field.kind === SecuritySettingKind.SECRET ? '' : (stored.get(field.key) ?? ''),
    ]),
  ) as SecuritySettingValues;
}

/** Which secrets the server reports as set (`configured: true`, or a legacy non-empty value). */
export function readSecretStatus(settings: ReadonlyArray<SystemSettingView>): SecuritySecretStatus {
  const status: SecuritySecretStatus = {};
  for (const field of SECURITY_SETTING_FIELDS) {
    if (field.kind !== SecuritySettingKind.SECRET) {
      continue;
    }
    const row = settings.find((setting) => setting.key === field.key);
    status[field.key] = row !== undefined && (row.configured === true || row.value.length > 0);
  }
  return status;
}

/**
 * The PUTs the save button sends. A secret is sent only when something was
 * typed (an empty secret box means "keep the stored one"); every other field
 * only when its normalised value differs from what the server holds.
 */
export function collectSecuritySettingChanges(
  baseline: SecuritySettingValues,
  values: SecuritySettingValues,
): SecuritySettingChange[] {
  const changes: SecuritySettingChange[] = [];
  for (const field of SECURITY_SETTING_FIELDS) {
    const next = normalizeSecuritySettingValue(field, values[field.key]);
    if (field.kind === SecuritySettingKind.SECRET) {
      if (next.length > 0) {
        changes.push({ key: field.key, value: next });
      }
      continue;
    }
    if (next !== normalizeSecuritySettingValue(field, baseline[field.key])) {
      changes.push({ key: field.key, value: next });
    }
  }
  return changes;
}

/** Every invalid field with its message; empty when the form can be saved. */
export function validateSecuritySettings(values: SecuritySettingValues): SecuritySettingErrors {
  const errors: SecuritySettingErrors = {};
  for (const field of SECURITY_SETTING_FIELDS) {
    const error = validateSecuritySetting(field, values[field.key]);
    if (error !== null) {
      errors[field.key] = error;
    }
  }
  return errors;
}

/** The page's cards, each with its fields in render order. */
export function groupSecuritySettingFields(): SecuritySettingGroupView[] {
  return SECURITY_SETTING_GROUPS.map((definition) => ({
    definition,
    fields: SECURITY_SETTING_FIELDS.filter((field) => field.group === definition.group),
  }));
}
