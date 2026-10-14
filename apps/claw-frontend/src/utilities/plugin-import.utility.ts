import {
  PLUGIN_IMPORT_COMMIT_SHORT_LENGTH,
  PLUGIN_IMPORT_ERROR_KEY_GENERIC,
  PLUGIN_IMPORT_ERROR_KEYS,
  PLUGIN_IMPORT_HTTP_PAYLOAD_TOO_LARGE,
  PLUGIN_IMPORT_MAX_UPLOAD_BYTES,
  PLUGIN_IMPORT_REASON_KEYS,
  PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY,
  PLUGIN_IMPORT_WARNING_KEYS,
} from '@/constants/plugin-import.constants';
import { ApiClientError } from '@/services/shared/api-client';

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
