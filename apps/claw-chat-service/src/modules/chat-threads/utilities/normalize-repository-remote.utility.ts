import {
  REMOTE_ALLOWED_PROTOCOLS,
  REMOTE_DOT_SEGMENT_PATTERN,
  REMOTE_GIT_SUFFIX,
  REMOTE_IDENTIFIER_SCHEME,
  REMOTE_PATH_FORBIDDEN_PATTERN,
  REMOTE_SCP_HOST_PATTERN,
  REMOTE_SCP_PATH_PATTERN,
  REMOTE_SCP_USER_PATTERN,
  REMOTE_URL_SCHEME_PATTERN,
} from '../constants/repository-ref.constants';
import type { RemoteParts } from '../types/repository-ref.types';

/**
 * One identifier for a git remote, so the same repository reached over https,
 * ssh or scp-like syntax compares equal: `https://host[:port]/path`, host in
 * lower case, no `.git`, no trailing slash.
 *
 * It is an identifier for matching a workspace to a thread, not a clone URL.
 * Credentials (`user:token@`), the query and the fragment are never carried
 * over: the result is built from the host, port and path alone, so a token
 * typed into a remote cannot reach the database. Anything that is not a remote
 * (a local path, `file:`, `javascript:`, a bare word) returns null.
 */
export function normalizeRepositoryRemote(raw: string): string | null {
  const text = raw.trim();
  // `new URL` would percent-encode a space, drop a control character or resolve
  // `..`, and call the result valid.
  if (REMOTE_PATH_FORBIDDEN_PATTERN.test(text) || REMOTE_DOT_SEGMENT_PATTERN.test(text)) {
    return null;
  }
  const parts = REMOTE_URL_SCHEME_PATTERN.test(text) ? fromUrl(text) : fromScp(text);
  if (parts === null) return null;
  const path = cleanPath(parts.path);
  return path === null ? null : `${REMOTE_IDENTIFIER_SCHEME}${parts.host}${parts.port}/${path}`;
}

function fromUrl(text: string): RemoteParts | null {
  const url = parseUrl(text);
  if (url === null || !REMOTE_ALLOWED_PROTOCOLS.includes(url.protocol) || url.hostname === '') {
    return null;
  }
  const web = url.protocol === 'http:' || url.protocol === 'https:';
  return {
    host: url.hostname.toLowerCase(),
    // `new URL` already drops a default port; ssh and git ports say nothing about the repository.
    port: web && url.port !== '' ? `:${url.port}` : '',
    path: url.pathname,
  };
}

function fromScp(text: string): RemoteParts | null {
  const colon = text.indexOf(':');
  const path = text.slice(colon + 1);
  // A Windows drive path fails the path check; `scheme://` was handled as a URL.
  if (colon < 1 || path.startsWith('//') || !REMOTE_SCP_PATH_PATTERN.test(path)) return null;
  const left = text.slice(0, colon);
  const at = left.lastIndexOf('@');
  const user = at < 0 ? undefined : left.slice(0, at);
  const host = at < 0 ? left : left.slice(at + 1);
  if (!REMOTE_SCP_HOST_PATTERN.test(host)) return null;
  if (user !== undefined && !REMOTE_SCP_USER_PATTERN.test(user)) return null;
  // `C:/x` and `javascript:x` have no user and no dot in the host: not remotes.
  return user === undefined && !host.includes('.')
    ? null
    : { host: host.toLowerCase(), port: '', path };
}

function parseUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function cleanPath(rawPath: string): string | null {
  const segments = rawPath.split('/').filter((segment) => segment !== '');
  const last = segments.at(-1);
  if (last === undefined) return null;
  const bare = last.endsWith(REMOTE_GIT_SUFFIX) ? last.slice(0, -REMOTE_GIT_SUFFIX.length) : last;
  return bare === '' ? null : [...segments.slice(0, -1), bare].join('/');
}
