// Turns browser File / data-URL input into the bare base64 payload the
// file-service upload endpoint expects (no `data:...;base64,` prefix).
export function base64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
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
