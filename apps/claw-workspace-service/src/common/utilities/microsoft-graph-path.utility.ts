/**
 * Encode a OneDrive/SharePoint Graph path segment for use in URLs of the
 * form `/v1.0/drives/{driveId}/root:{path}:`.
 *
 * Microsoft Graph path syntax: leading `/` required, individual segments
 * URL-encoded, but the slashes between segments preserved. The `:` separators
 * are reserved on the host side and must NOT be encoded.
 */
export function encodeGraphPath(path: string): string {
  if (path.length === 0 || path === '/') {
    return '';
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized
    .split('/')
    .map((segment) => (segment.length === 0 ? '' : encodeURIComponent(segment)))
    .join('/');
}
