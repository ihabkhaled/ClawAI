/** A repository path as a URL path: every segment percent-encoded, the slashes kept. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
