import {
  PLUGIN_IMPORT_COMMIT_SHORT_LENGTH,
  PLUGIN_IMPORT_ERROR_KEY_GENERIC,
  PLUGIN_IMPORT_ERROR_KEYS,
  PLUGIN_IMPORT_HTTP_PAYLOAD_TOO_LARGE,
  PLUGIN_IMPORT_MS_PER_SECOND,
  PLUGIN_IMPORT_RATE_LIMITED_AT_KEY,
  PLUGIN_IMPORT_MAX_UPLOAD_BYTES,
  PLUGIN_IMPORT_RATE_LIMITED_CODE,
  PLUGIN_IMPORT_REASON_KEYS,
  PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY,
  PLUGIN_IMPORT_WARNING_KEYS,
} from '@/constants/plugin-import.constants';
import { ApiClientError } from '@/services/shared/api-client';
import type { PluginsTranslate } from '@/types/plugins.types';

function lookup(
  table: Readonly<Record<string, string>>,
  key: string | undefined,
): string | undefined {
  return key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;
}

/** The translation key for a failed import call: by the service's code, then by status, else generic. */
export function pluginImportErrorKey(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return PLUGIN_IMPORT_ERROR_KEY_GENERIC;
  }
  const byCode = lookup(PLUGIN_IMPORT_ERROR_KEYS, error.code);
  if (byCode !== undefined) {
    return byCode;
  }
  return error.status === PLUGIN_IMPORT_HTTP_PAYLOAD_TOO_LARGE
    ? PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY
    : PLUGIN_IMPORT_ERROR_KEY_GENERIC;
}

/** The key for a component's "why not usable" reason, or undefined when it has none or it is new. */
export function pluginImportReasonKey(reason: string | undefined): string | undefined {
  return lookup(PLUGIN_IMPORT_REASON_KEYS, reason);
}

/** The key for a review warning; an unknown warning is skipped rather than shown as a raw code. */
export function pluginImportWarningKey(warning: string): string | undefined {
  return lookup(PLUGIN_IMPORT_WARNING_KEYS, warning);
}

export function isUploadTooLarge(file: File): boolean {
  return file.size > PLUGIN_IMPORT_MAX_UPLOAD_BYTES;
}

export function shortCommit(sha: string | null): string {
  return sha === null ? '' : sha.slice(0, PLUGIN_IMPORT_COMMIT_SHORT_LENGTH);
}

/**
 * When GitHub lets the import try again, as a clock time in the user's language, for a rate-limited
 * refusal that carried a `Retry-After`. Undefined for any other failure.
 */
export function pluginImportRetryTime(
  error: unknown,
  locale: string,
  nowMs: number = Date.now(),
): string | undefined {
  if (
    !(error instanceof ApiClientError) ||
    error.code !== PLUGIN_IMPORT_RATE_LIMITED_CODE ||
    error.retryAfterSeconds === undefined ||
    error.retryAfterSeconds <= 0
  ) {
    return undefined;
  }
  const at = new Date(nowMs + error.retryAfterSeconds * PLUGIN_IMPORT_MS_PER_SECOND);
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(at);
}

/** The message for a failed import: with the clock time when GitHub said when to come back. */
export function importErrorText(
  t: PluginsTranslate,
  errorKey: string,
  retryTime: string | undefined,
): string {
  return retryTime === undefined
    ? t(errorKey)
    : t(PLUGIN_IMPORT_RATE_LIMITED_AT_KEY, { time: retryTime });
}
