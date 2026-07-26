/**
 * Application-layer envelope encryption for vaulted gateway tokens.
 *
 * AES-256-GCM: authenticated, so tampering is detected rather than silently
 * decrypting to garbage that some later code path treats as a token.
 */
export const TOKEN_VAULT_ALGORITHM = 'aes-256-gcm';

/**
 * 96-bit nonce — the size GCM is specified for. Longer nonces are hashed down
 * internally and gain nothing; shorter ones shrink the space a random nonce is
 * drawn from, and a repeat under one key breaks the mode.
 */
export const TOKEN_VAULT_NONCE_BYTES = 12;

/** Full 128-bit authentication tag. Truncating it weakens forgery resistance. */
export const TOKEN_VAULT_AUTH_TAG_BYTES = 16;

/** `.` cannot appear in base64url output, so it can never split a field. */
export const TOKEN_VAULT_ENVELOPE_SEPARATOR = '.';

/**
 * Format marker, bound into the AAD.
 *
 * Because it is authenticated, an attacker cannot downgrade a ciphertext to an
 * older envelope format by rewriting the prefix.
 */
export const TOKEN_VAULT_ENVELOPE_VERSION = 'claw-pmt-v1';

/** HMAC-SHA-256 for the dedup blind index. */
export const TOKEN_VAULT_BLIND_INDEX_ALGORITHM = 'sha256';
