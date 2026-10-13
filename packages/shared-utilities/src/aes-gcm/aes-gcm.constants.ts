/**
 * At-rest encryption format shared by services that seal secrets: AES-256-GCM,
 * 16-byte nonce, 16-byte tag, `base64(nonce || tag || ciphertext)`, with additional
 * authenticated data (AAD) so a ciphertext is bound to the row it was written for.
 */
export const AES_GCM_ALGORITHM = 'aes-256-gcm';
export const AES_GCM_NONCE_BYTES = 16;
export const AES_GCM_TAG_BYTES = 16;
export const AES_GCM_KEY_BYTES = 32;
export const AES_GCM_KEY_HEX_PATTERN = /^[\da-f]{64}$/i;
export const AES_GCM_ZERO_KEY_PATTERN = /^0{64}$/;

/** Fixed messages: none ever includes the key, the plaintext or the ciphertext. */
export const AES_GCM_KEY_INVALID_MESSAGE = 'encryption key must be a 64-character hex string';
export const AES_GCM_MALFORMED_MESSAGE = 'ciphertext is malformed';
