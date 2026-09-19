import { SessionClientKind } from '../enums/session-client-kind.enum';

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const EXPIRY_PATTERN = /^(\d+)(s|m|h|d)$/u;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
export const TOKEN_TYPE = 'Bearer' as const;

/**
 * A refresh token used this recently may be presented again and gets a sibling
 * token in the same family instead of revoking it. Two browser tabs, or two VS
 * Code windows, refreshing at the same moment do this, and so does a client
 * whose refresh response was lost to sleep or a dropped connection. Without the
 * window each of those signed the user out everywhere. A replay after it is
 * still treated as theft and revokes the family.
 */
export const REFRESH_REUSE_GRACE_MS = 30_000;

/**
 * Refresh lifetime when "Remember me" is off: the session also ends when the
 * browser closes. With it on, the lifetime is JWT_REFRESH_EXPIRY. Both slide:
 * each refresh starts the lifetime again.
 */
export const SESSION_ONLY_REFRESH_TTL_SECONDS = 12 * SECONDS_PER_HOUR;
export const WEB_SESSION_CLIENT = {
  kind: SessionClientKind.WEB,
  name: 'ClawAI Web',
} as const;
export const VSCODE_SESSION_CLIENT = {
  kind: SessionClientKind.VSCODE,
  name: 'ClawAI for VS Code',
} as const;
