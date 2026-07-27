import { SessionClientKind } from '../enums/session-client-kind.enum';

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const EXPIRY_PATTERN = /^(\d+)(s|m|h|d)$/u;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
export const TOKEN_TYPE = 'Bearer' as const;
export const WEB_SESSION_CLIENT = {
  kind: SessionClientKind.WEB,
  name: 'ClawAI Web',
} as const;
