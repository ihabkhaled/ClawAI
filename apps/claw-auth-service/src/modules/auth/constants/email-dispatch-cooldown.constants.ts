/**
 * Redis key prefix for address-triggered email cooldowns. The address is
 * hashed into the key, never stored in it.
 */
export const EMAIL_DISPATCH_COOLDOWN_PREFIX = 'auth:email-dispatch:';

/**
 * How long an address must wait between password-reset requests.
 *
 * Longer than the confirmation window: a confirmation email is something the
 * user is actively waiting for and may reasonably chase, while a reset request
 * is a one-off. The gap also makes the reset endpoint the less attractive of
 * the two to hammer.
 */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 120;
