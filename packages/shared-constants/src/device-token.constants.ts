/**
 * F097 — the mobile device token class (read runs, approve, cancel).
 *
 * The scope strings repeat `MobileDeviceScope` from `@claw/shared-types`
 * (this package has no dependency on it); agent-service carries a test that
 * keeps the two lists identical. Every number here is a ceiling: a deployment
 * may configure a shorter lifetime for the desktop agent, never a longer one
 * for a mobile token.
 */

/** Wire value of `DeviceTokenClass.MOBILE`. */
export const MOBILE_TOKEN_CLASS = 'mobile' as const;

/** The only scopes a mobile token can ever carry. Anything else is refused at pairing. */
export const MOBILE_DEVICE_SCOPE_VALUES = ['runs:read', 'runs:approve', 'runs:cancel'] as const;

/** Access token lifetime. Short: a stolen one is useless in ten minutes. */
export const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 600;

/** Each refresh rotation is valid this long. */
export const MOBILE_REFRESH_TOKEN_TTL_DAYS = 7;

/** A mobile device must be re-paired this long after it was first paired, however often it refreshed. */
export const MOBILE_DEVICE_MAX_AGE_DAYS = 30;

/** Active mobile devices per user. A sixth pairing is refused until one is revoked. */
export const MOBILE_MAX_ACTIVE_DEVICES_PER_USER = 5;

/** Context string the mobile access-token signing key is derived with (see agent-service token.service). */
export const MOBILE_ACCESS_TOKEN_KEY_CONTEXT = 'claw:agent-mobile-access-token:v1' as const;

export const MOBILE_JWT_ISSUER = 'claw-agent-service' as const;
export const MOBILE_JWT_AUDIENCE = 'claw-agent-mobile' as const;
