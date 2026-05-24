// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { extname } from 'node:path';

export function getExtension(filename: string): string {
  return extname(filename).toLowerCase();
}

export function matchesAny(filename: string, extensions: readonly string[]): boolean {
  const ext = getExtension(filename);
  return extensions.includes(ext);
}

export function mimeOrExtensionMatches(
  mimeType: string,
  filename: string,
  mimeTypes: readonly string[],
  extensions: readonly string[],
): boolean {
  if (mimeTypes.includes(mimeType.toLowerCase())) return true;
  return matchesAny(filename, extensions);
}
