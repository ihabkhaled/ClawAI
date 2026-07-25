// Submissions faster than this since form mount are almost certainly bots.
// Kept modest so a fast-but-real user is never blocked.
export const CONTACT_MIN_ELAPSED_MS = 1500;

// Headers consulted (in order) to identify the client for rate limiting.
// Behind nginx the real client IP arrives in X-Forwarded-For / X-Real-IP.
export const CONTACT_CLIENT_IP_HEADERS: ReadonlyArray<string> = ['x-forwarded-for', 'x-real-ip'];

export const CONTACT_UNKNOWN_CLIENT = 'unknown';

// Maps a server response code to the i18n key the form surfaces to the user.
// Success codes are handled separately (success banner), so only the
// error/limit paths appear here.
export const CONTACT_ERROR_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  invalid: 'marketing.contact.errorInvalid',
  rate_limited: 'marketing.contact.errorRateLimited',
  error: 'marketing.contact.errorGeneric',
  rejected: 'marketing.contact.errorGeneric',
};

// The only SMTP port that speaks implicit TLS (SMTPS) from the first byte.
// 587 and 25 begin in plaintext and upgrade via STARTTLS — sending a TLS
// ClientHello to those makes the server's plaintext greeting parse as a TLS
// record, which surfaces as "wrong version number".
export const SMTP_IMPLICIT_TLS_PORT = 465;
