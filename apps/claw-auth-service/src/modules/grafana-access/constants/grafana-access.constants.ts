import { USER_JWT_ISSUER } from '@claw/shared-constants';

/**
 * Grafana behind the admin session (ADR-115).
 *
 * The browser proves it is an admin to nginx with this cookie. nginx cannot
 * read the app's access token — it lives in the page's storage, not in a
 * header a plain navigation to /grafana/ would carry — so auth-service mints a
 * narrow, short-lived cookie that only the /grafana path ever sends.
 */
export const GRAFANA_ACCESS_COOKIE_NAME = 'claw_grafana';

/** The browser sends the cookie to /grafana and below, and nowhere else. */
export const GRAFANA_ACCESS_COOKIE_PATH = '/grafana';

/**
 * The derivation context for the cookie's signing key. Versioned so a future
 * format change can invalidate every outstanding cookie by bumping it.
 */
export const GRAFANA_ACCESS_KEY_CONTEXT = 'claw:grafana-access-cookie:v1';

export const GRAFANA_ACCESS_AUDIENCE = 'claw-grafana';
export const GRAFANA_ACCESS_ISSUER = USER_JWT_ISSUER;

/**
 * The upper bound on a cookie's life. The real lifetime is the SMALLER of this
 * and the access-token lifetime, and that second bound is load-bearing: a
 * revoked session is remembered in Redis for exactly one access-token
 * lifetime (TD-033). A cookie that outlived that entry would outlive its own
 * revocation.
 */
export const GRAFANA_ACCESS_MAX_TTL_SECONDS = 15 * 60;

/**
 * The response header nginx copies into the one Grafana trusts
 * (`auth_request_set` → `X-WEBAUTH-EMAIL`). Lower-case: Node normalises
 * header names, and nginx matches case-insensitively.
 */
export const GRAFANA_USER_HEADER = 'x-grafana-user';

export const GRAFANA_ACCESS_DENIED_MESSAGE = 'Grafana access denied';
export const GRAFANA_ACCESS_DENIED_CODE = 'GRAFANA_ACCESS_DENIED';
