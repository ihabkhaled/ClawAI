/**
 * Thin wrapper around the browser Clipboard API so callers never touch
 * `navigator.clipboard` directly (library-wrapping rule). Resolves to `true`
 * on success and `false` when the clipboard is unavailable or the write fails.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
