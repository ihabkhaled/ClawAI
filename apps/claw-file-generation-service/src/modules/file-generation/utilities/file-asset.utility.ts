import {
  GENERATED_FILENAME_PATTERN,
  MAX_DOWNLOAD_FILENAME_LENGTH,
  SAFE_FILENAME_PATTERN,
} from '../constants/file-asset.constants';
import { filenameBase } from './file-identity.utility';
import type {
  AssetExpiryFields,
  FileGenerationRecord,
  FileGenerationView,
} from '../types/file-generation.types';

/** The download URL the browser sees: no file-service id, no storage path. */
export function fileAssetDownloadPath(generationId: string, assetId: string): string {
  return `/api/v1/file-generations/${generationId}/assets/${assetId}/download`;
}

/**
 * A filename safe for Content-Disposition: no path separators, quotes, control
 * characters or header-splitting newlines; the extension is always the one the
 * format implies, never one the model or user typed.
 */
export function safeDownloadFilename(requested: string | null, extension: string): string {
  const base = (requested ?? '')
    .replace(/\.[A-Za-z0-9]{1,8}$/u, '')
    .replace(SAFE_FILENAME_PATTERN, '-')
    .replaceAll(/-{2,}/gu, '-')
    .replaceAll(/^[-. ]+|[-. ]+$/gu, '')
    .slice(0, MAX_DOWNLOAD_FILENAME_LENGTH);
  return `${base.length > 0 ? base : 'claw-file'}.${extension}`;
}

export function isAssetExpired(asset: AssetExpiryFields, now: Date): boolean {
  return asset.expiredAt !== null || (asset.expiresAt !== null && asset.expiresAt <= now);
}

/**
 * The user-facing shape of a generation: every asset without its storage
 * key. The download path names the asset; the stored file's id stays inside
 * the backend (ADR-104).
 */
export function toGenerationView(record: FileGenerationRecord): FileGenerationView {
  return {
    ...record,
    assets: record.assets.map(({ storageKey: _storageKey, ...asset }) => asset),
  };
}

/** The document title a filename carries, or null for a made-up one. */
export function documentTitleFromFilename(filename: string | null): string | null {
  if (filename === null || GENERATED_FILENAME_PATTERN.test(filename)) {
    return null;
  }
  const title = filename.replace(/\.[A-Za-z0-9]{1,5}$/u, '').trim();
  return title.length > 0 ? title : null;
}

/** A download's name in any script: the stored name, cleaned, with the format's extension. */
export function unicodeDownloadFilename(requested: string | null, extension: string): string {
  const base = filenameBase((requested ?? '').replace(/\.[A-Za-z0-9]{1,8}$/u, ''));
  return `${base}.${extension}`;
}

/**
 * `Content-Disposition` for a download. Browsers use `filename*` (RFC 5987,
 * UTF-8), so an Arabic or Chinese title stays readable. `filename` is an
 * ASCII fallback for anything older. Both are cleaned, so no name can break
 * out of the header.
 */
export function contentDisposition(asciiFilename: string, unicodeFilename: string): string {
  const encoded = encodeURIComponent(unicodeFilename).replaceAll(
    /['()*]/gu,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encoded}`;
}
