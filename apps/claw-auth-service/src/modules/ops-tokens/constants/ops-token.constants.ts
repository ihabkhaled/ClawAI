import type { OpsTokenVerification } from '../types/ops-token.types';

/** Every ops token starts with this, so a leaked one is recognisable in a scan. */
export const OPS_TOKEN_PREFIX = 'claw_ops_';

/** Random bytes behind the prefix: 256 bits. */
export const OPS_TOKEN_RANDOM_BYTES = 32;

/** Characters of the token kept in clear for display ("claw_ops_ab12..."). */
export const OPS_TOKEN_DISPLAY_PREFIX_LENGTH = 13;

/** A token lives at most this long; there are no forever tokens. */
export const OPS_TOKEN_MAX_TTL_DAYS = 90;
export const OPS_TOKEN_DEFAULT_TTL_DAYS = 30;

/** A person may hold at most this many live tokens. */
export const OPS_TOKEN_MAX_ACTIVE_PER_USER = 10;

export const MS_PER_DAY = 86_400_000;

/** The one answer for every refused token: wrong, expired, revoked or unscoped alike. */
export const OPS_TOKEN_INVALID: OpsTokenVerification = { valid: false, tokenId: null, scopes: [] };
