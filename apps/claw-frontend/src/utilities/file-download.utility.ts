import { DOWNLOAD_REVOKE_DELAY_MS } from '@/constants/download-filename.constants';

import { ensureFilenameExtension } from './download-blob.utility';

export function saveBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = ensureFilenameExtension(filename, blob.type);
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously races the download on mobile browsers, which then
  // save nothing or a nameless "blob".
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_REVOKE_DELAY_MS);
}
