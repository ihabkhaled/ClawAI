import { createHash } from 'node:crypto';

import { type BundleFile, type ImportPreview } from '../types/plugin-import.types';

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * The fingerprint the user reviews and confirms: every kept file (path + content hash, sorted) and the
 * component list the preview showed. A change to either between preview and install changes it.
 */
export function computeBundleChecksum(
  files: readonly BundleFile[],
  preview: ImportPreview,
): string {
  const lines = files
    .map((file) => `${file.path}\u0000${sha256(file.content)}`)
    .sort((a, b) => a.localeCompare(b, 'en'));
  const components = preview.components.map(
    (component) =>
      `${component.kind}\u0000${component.name}\u0000${component.support}\u0000${component.url ?? ''}`,
  );
  return sha256([...lines, '--', ...components.sort()].join('\n'));
}
