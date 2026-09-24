/**
 * Saves an already-fetched blob URL to disk under `filename`, without a real
 * navigation (the file lives behind an auth header, so a plain `<a href>` to
 * the API can't be used — the browser would send no Authorization header).
 */
export function triggerBrowserDownload(blobUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Opens an already-fetched blob URL in a new tab (native PDF viewer, etc). */
export function openBlobInNewTab(blobUrl: string): void {
  window.open(blobUrl, '_blank', 'noopener');
}
