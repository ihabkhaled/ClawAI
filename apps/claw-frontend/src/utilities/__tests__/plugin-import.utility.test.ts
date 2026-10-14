import { describe, expect, it } from 'vitest';

import { PLUGIN_IMPORT_MAX_UPLOAD_BYTES } from '@/constants/plugin-import.constants';
import { ApiClientError } from '@/services/shared/api-client';
import {
  isUploadTooLarge,
  pluginImportErrorKey,
  pluginImportReasonKey,
  pluginImportRetryTime,
  pluginImportWarningKey,
  shortCommit,
} from '@/utilities/plugin-import.utility';

function failure(status: number, code?: string): ApiClientError {
  return new ApiClientError({ message: 'x', status, code });
}

describe('plugin import utilities', () => {
  it('maps a service code to its message key and shares one message between related codes', () => {
    expect(pluginImportErrorKey(failure(422, 'PLUGIN_IMPORT_PATH_UNSAFE'))).toBe(
      'pluginImport.errors.pathUnsafe',
    );
    expect(pluginImportErrorKey(failure(422, 'PLUGIN_IMPORT_ARCHIVE_BOMB'))).toBe(
      'pluginImport.errors.archiveTooBig',
    );
    expect(pluginImportErrorKey(failure(409, 'PLUGIN_IMPORT_DUPLICATE_PLUGIN'))).toBe(
      'pluginImport.errors.duplicatePlugin',
    );
  });

  it('falls back by status, then to the generic message, and never trusts a prototype key', () => {
    expect(pluginImportErrorKey(failure(413))).toBe('pluginImport.errors.uploadTooLarge');
    expect(pluginImportErrorKey(failure(500, 'SOMETHING_NEW'))).toBe('pluginImport.errors.generic');
    expect(pluginImportErrorKey(failure(500, '__proto__'))).toBe('pluginImport.errors.generic');
    expect(pluginImportErrorKey(new Error('boom'))).toBe('pluginImport.errors.generic');
  });

  it('skips an unknown reason or warning instead of showing a raw code', () => {
    expect(pluginImportReasonKey('stdio')).toBe('pluginImport.reason.stdio');
    expect(pluginImportReasonKey('brand-new')).toBeUndefined();
    expect(pluginImportReasonKey(undefined)).toBeUndefined();
    expect(pluginImportWarningKey('hooks-not-run')).toBe('pluginImport.warning.hooksNotRun');
    expect(pluginImportWarningKey('constructor')).toBeUndefined();
  });

  it('checks the upload size and shortens a commit', () => {
    const big = new File([new Uint8Array(PLUGIN_IMPORT_MAX_UPLOAD_BYTES + 1)], 'a.zip');
    const small = new File([new Uint8Array(10)], 'a.zip');
    expect(isUploadTooLarge(big)).toBe(true);
    expect(isUploadTooLarge(small)).toBe(false);
    expect(shortCommit('a'.repeat(40))).toBe('a'.repeat(12));
    expect(shortCommit(null)).toBe('');
  });

  it('maps the codes added by the QA fixes to a localized message', () => {
    expect(pluginImportErrorKey(failure(413, 'PLUGIN_IMPORT_FILE_TOO_LARGE'))).toBe(
      'pluginImport.errors.uploadTooLarge',
    );
    expect(pluginImportErrorKey(failure(422, 'PLUGIN_IMPORT_CONTENT_INVALID'))).toBe(
      'pluginQa.errors.contentInvalid',
    );
    expect(pluginImportErrorKey(failure(422, 'PLUGIN_IMPORT_PARSE_FAILED'))).toBe(
      'pluginQa.errors.parseFailed',
    );
    expect(pluginImportErrorKey(failure(422, 'PLUGIN_IMPORT_UPLOAD_MISSING'))).toBe(
      'pluginImport.errors.uploadMissing',
    );
  });

  it('turns a rate limit with a Retry-After into a clock time, and nothing else', () => {
    const limited = new ApiClientError({
      message: 'x',
      status: 429,
      code: 'PLUGIN_IMPORT_SOURCE_RATE_LIMITED',
      retryAfterSeconds: 600,
    });
    const now = Date.UTC(2026, 9, 15, 10, 0, 0);
    const time = pluginImportRetryTime(limited, 'en-GB', now);

    expect(time).toMatch(/^\d{2}:\d{2}$/);
    expect(
      pluginImportRetryTime(failure(429, 'PLUGIN_IMPORT_SOURCE_RATE_LIMITED'), 'en'),
    ).toBeUndefined();
    expect(
      pluginImportRetryTime(failure(422, 'PLUGIN_IMPORT_NO_PLUGIN_FOUND'), 'en'),
    ).toBeUndefined();
    expect(pluginImportRetryTime(null, 'en')).toBeUndefined();
  });
});
