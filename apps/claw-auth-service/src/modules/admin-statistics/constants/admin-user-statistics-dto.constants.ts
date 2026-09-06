/**
 * Upper bound on a user id accepted by the admin statistics routes.
 *
 * 64 to match `CREDIT_USER_ID_MAX_LENGTH`, which bounds the same identifier on
 * the credit routes. Ids here are cuids (25 chars), so this is headroom rather
 * than a fit — but it is stated locally instead of imported from the credit
 * module so that module's money-path constant stays free to change for its own
 * reasons without silently loosening validation on an unrelated controller.
 */
export const ADMIN_STATISTICS_USER_ID_MAX_LENGTH = 64;
