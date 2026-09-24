import {
  DOWNLOAD_EXTENSION_BY_MIME,
  DOWNLOAD_FALLBACK_BASENAME,
} from '@/constants/download-filename.constants';

/**
 * A blob URL carries no name, so anything that saves without an explicit,
 * extension-bearing `download` name lands on disk as "blob" (or the blob's
 * UUID) with no extension. Every save path goes through this.
 */
export function ensureFilenameExtension(filename: string, mimeType?: string): string {
  const trimmed = filename.trim();
  const base = trimmed.length > 0 ? trimmed : DOWNLOAD_FALLBACK_BASENAME;
  if (/\.[a-z0-9]{1,8}$/iu.test(base)) {
    return base;
  }
  const baseMime = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  const extension = DOWNLOAD_EXTENSION_BY_MIME[baseMime];
  return extension === undefined ? base : `${base}.${extension}`;
}

/**
 * Saves an already-fetched blob URL to disk under `filename`, without a real
 * navigation (the file lives behind an auth header, so a plain `<a href>` to
 * the API can't be used — the browser would send no Authorization header).
 */
export function triggerBrowserDownload(blobUrl: string, filename: string, mimeType?: string): void {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = ensureFilenameExtension(filename, mimeType);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Opens an already-fetched blob URL in a new tab (native PDF viewer, etc). */
export function openBlobInNewTab(blobUrl: string): void {
  window.open(blobUrl, '_blank', 'noopener');
}
