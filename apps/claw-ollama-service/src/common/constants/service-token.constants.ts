/**
 * `Authorization` scheme sibling services use to call this one with the
 * shared `INTER_SERVICE_AUTH_TOKEN` (`Authorization: Service <token>`).
 * Users send `Bearer <jwt>`; the scheme is what tells the two apart.
 */
export const SERVICE_TOKEN_SCHEME_PREFIX = 'Service ';
