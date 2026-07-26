/**
 * Shape of a public share identifier: base64url of 16 random bytes, which is
 * always 22 characters with no padding.
 *
 * Mirrors `isValidPublicShareId` in chat-service. Duplicated deliberately — the
 * frontend does not depend on backend packages, and the point of checking here is
 * to refuse an enumeration sweep before it costs a network call. If the backend
 * ever widens the identifier, this pattern must widen in the same change.
 */
export const PUBLIC_SHARE_ID_PATTERN = /^[\w-]{22}$/u;
