/**
 * The service's at-rest encryption format. It is the format the connector, auth and
 * research services already use for `ENCRYPTION_KEY` (AES-256-GCM, 16-byte nonce,
 * 16-byte tag, `base64(nonce || tag || ciphertext)`), extended only by additional
 * authenticated data (AAD) so a ciphertext is bound to the row it was written for.
 */
export const AES_GCM_ALGORITHM = 'aes-256-gcm';
export const AES_GCM_NONCE_BYTES = 16;
export const AES_GCM_TAG_BYTES = 16;
export const AES_GCM_KEY_BYTES = 32;

/** Fixed messages: none ever includes the key, the plaintext or the ciphertext. */
export const AES_GCM_KEY_INVALID_MESSAGE = 'ENCRYPTION_KEY must be a 64-character hex string';
export const AES_GCM_MALFORMED_MESSAGE = 'ciphertext is malformed';
