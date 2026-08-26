// Turns browser File / data-URL input into the bare base64 payload the
// file-service upload endpoint expects (no `data:...;base64,` prefix).
export function base64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

/**
 * Exact decoded byte count for a base64 payload.
 *
 * `length * 3 / 4` is the size BEFORE padding is removed: every trailing '='
 * stands for one byte that is not there. Rounding that estimate up overstated
 * a screenshot by one or two bytes, and file-service compares the declared size
 * against the decoded size exactly — so every screenshot and pasted image was
 * rejected with 400 FILE_SIZE_MISMATCH and the dialog showed "Upload failed".
 */
export function base64ByteLength(base64: string): number {
  const content = base64.replaceAll(/\s/gu, '');
  if (content.length === 0) {
    return 0;
  }
  let padding = 0;
  if (content.endsWith('==')) {
    padding = 2;
  } else if (content.endsWith('=')) {
    padding = 1;
  }
  return (content.length * 3) / 4 - padding;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unreadable file'));
        return;
      }
      resolve(base64FromDataUrl(result));
    };
    reader.onerror = (): void => reject(new Error('Unreadable file'));
    reader.readAsDataURL(file);
  });
}
