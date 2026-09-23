/** What `POST /auth/grafana-access` hands the controller to set as a cookie. */
export interface GrafanaAccessGrant {
  token: string;
  maxAgeSeconds: number;
  expiresAt: string;
}

/** What the browser receives. The token itself only ever travels as the cookie. */
export interface GrafanaAccessGrantView {
  expiresAt: string;
}

/** Who a valid cookie belongs to — the identity Grafana signs in. */
export interface GrafanaAccessIdentity {
  email: string;
}

/** The fields the controller passes to `res.cookie`. */
export interface GrafanaAccessCookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}
