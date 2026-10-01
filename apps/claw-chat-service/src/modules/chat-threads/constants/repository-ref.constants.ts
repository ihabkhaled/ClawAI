/**
 * F095: the repository a coding-agent thread belongs to, so a later session can
 * tell whether its workspace is the same project.
 */

export const REPOSITORY_NAME_MAX = 200;
export const REPOSITORY_BRANCH_MAX = 200;
export const REPOSITORY_REMOTE_MAX = 500;

/** A folder or repository name, not a path: no separators, no control characters. */
export const REPOSITORY_NAME_PATTERN = /^[^/\\\p{Cc}]+$/u;

/** A git ref name, narrowed: no whitespace, control characters or `~ ^ : ? * [ \`. */
export const REPOSITORY_BRANCH_PATTERN = /^[^\s\p{Cc}~^:?*[\\]+$/u;

/** `scheme://...`, the form `new URL` understands. */
export const REMOTE_URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

/** The pieces of an scp-like remote (`[user@]host:path`), each checked on its own. */
export const REMOTE_SCP_HOST_PATTERN = /^[a-z0-9][a-z0-9.-]*$/i;
export const REMOTE_SCP_USER_PATTERN = /^[^@/\s:]+$/;

/**
 * The scp-like path is limited to ordinary repository characters, so
 * `javascript:alert(1)` and `data:text/plain,x` never read as a remote.
 */
export const REMOTE_SCP_PATH_PATTERN = /^[\w.~+@%/-]+$/;

/** Remote schemes a repository identifier may come from. */
export const REMOTE_ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:', 'ssh:', 'git:'];

/** Whitespace or a control character anywhere in the remote makes it unusable. */
export const REMOTE_PATH_FORBIDDEN_PATTERN = /[\s\p{Cc}]/u;

/** A `..` segment: `new URL` would resolve it into a different repository than the one written. */
export const REMOTE_DOT_SEGMENT_PATTERN = /(?:^|[/:])\.\.(?:[/?#]|$)/;

export const REMOTE_GIT_SUFFIX = '.git';
export const REMOTE_IDENTIFIER_SCHEME = 'https://';
