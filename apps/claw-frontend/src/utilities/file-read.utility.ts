// Reads a File into a base64 string (no data-URL prefix), the shape the upload
// pipeline's `content` field expects. Wraps the browser FileReader so callers
// never touch the API directly (library-wrapping rule).
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}
