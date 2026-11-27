import type { ScreeningOrigin } from '../types/device.types';
import { VENDORED_DISPOSABLE_EMAIL_DOMAINS } from './disposable-email-domains.constants';

/** A request whose origin is unknown (tests, internal callers). */
export const EMPTY_SCREENING_ORIGIN: Readonly<ScreeningOrigin> = {
  ip: null,
  countryCode: null,
  userAgent: null,
};

// ── SystemSetting keys (admin-editable, read through SystemSettingService) ──────
// Secret keys are write-only on the admin settings API (masked on every read).

export const SECURITY_SETTING_TURNSTILE_SITE_KEY = 'security.turnstile.siteKey';
export const SECURITY_SETTING_TURNSTILE_SECRET_KEY = 'security.turnstile.secretKey';
export const SECURITY_SETTING_RECAPTCHA_SITE_KEY = 'security.recaptcha.siteKey';
export const SECURITY_SETTING_RECAPTCHA_SECRET_KEY = 'security.recaptcha.secretKey';
export const SECURITY_SETTING_RECAPTCHA_MIN_SCORE = 'security.recaptcha.minScore';
export const SECURITY_SETTING_POW_DIFFICULTY = 'security.pow.difficulty';
export const SECURITY_SETTING_EMAIL_BLOCKED_DOMAINS = 'security.email.blockedDomains';
export const SECURITY_SETTING_EMAIL_ALLOWED_DOMAINS = 'security.email.allowedDomains';
export const SECURITY_SETTING_SIGNUP_MAX_PER_10_MIN = 'security.signup.maxPer10Min';
export const SECURITY_SETTING_SIGNUP_MAX_PER_DEVICE_PER_DAY = 'security.signup.maxPerDevicePerDay';

// ── Defaults and bounds (a value outside its bounds reads as the default) ───────

export const DEFAULT_RECAPTCHA_MIN_SCORE = 0.5;
export const RECAPTCHA_MIN_SCORE_FLOOR = 0;
export const RECAPTCHA_MIN_SCORE_CEILING = 1;

/** ~0.3-1.5 s in a browser Web Worker at 18 leading zero bits. */
export const DEFAULT_POW_DIFFICULTY = 18;
export const POW_DIFFICULTY_MIN = 12;
export const POW_DIFFICULTY_MAX = 24;

export const DEFAULT_SIGNUP_MAX_PER_10_MIN = 30;
export const DEFAULT_SIGNUP_MAX_PER_DEVICE_PER_DAY = 3;
export const SIGNUP_LIMIT_MIN = 1;
export const SIGNUP_LIMIT_MAX = 100_000;

/** Admin domain lists are comma (or whitespace) separated. */
export const DOMAIN_LIST_SEPARATOR = /[\s,;]+/u;

// ── Proof of work ──────────────────────────────────────────────────────────────

/** A challenge lives five minutes; the single-use claim outlives it by a margin. */
export const POW_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const POW_CLAIM_MARGIN_SECONDS = 60;
export const POW_SALT_BYTES = 16;
export const POW_TOKEN_VERSION = 1;
export const POW_TOKEN_MAX_LENGTH = 1024;
/** Decimal digits only; 20 covers every unsigned 64-bit counter a solver can reach. */
export const POW_NONCE_PATTERN = /^\d{1,20}$/u;
export const POW_SALT_PATTERN = /^[0-9a-f]{32}$/u;
export const POW_TOKEN_SEPARATOR = '.';
export const SHA256_BITS = 256;
export const BITS_PER_BYTE = 8;

/**
 * Context strings for keys derived from server secrets (`deriveScopedKey`). No new
 * env var: the proof-of-work key derives from JWT_SECRET (rotating it only voids
 * five-minute challenges); the device pepper derives from ENCRYPTION_KEY, which is
 * never rotated in place (it would also void every encrypted column), so device
 * hashes stay comparable across a JWT_SECRET rotation.
 */
export const POW_SIGNING_KEY_CONTEXT = 'claw:anti-abuse:pow-challenge:v1';
export const DEVICE_PEPPER_KEY_CONTEXT = 'claw:anti-abuse:device-pepper:v1';

// ── Device input bounds (the DTO) ──────────────────────────────────────────────

export const DEVICE_FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/u;
export const DEVICE_ID_MAX_LENGTH = 64;
export const DEVICE_SIGNAL_TEXT_MAX_LENGTH = 256;
export const DEVICE_SIGNAL_SHORT_MAX_LENGTH = 64;
export const DEVICE_SIGNAL_NUMBER_MAX = 4096;
/** Turnstile tokens run to ~2 KB; reCAPTCHA v3 tokens are longer still. */
export const CAPTCHA_TOKEN_MAX_LENGTH = 4096;
/** The security-event fingerprint is the first 8 characters of the PEPPERED hash. */
export const FINGERPRINT_LOG_PREFIX_LENGTH = 8;

// ── Captcha providers ──────────────────────────────────────────────────────────

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
/** The only hosts a captcha verify call may reach (TD-038 URL guard). */
export const CAPTCHA_VERIFY_HOSTS: ReadonlySet<string> = new Set([
  new URL(TURNSTILE_VERIFY_URL).host,
  new URL(RECAPTCHA_VERIFY_URL).host,
]);
export const CAPTCHA_VERIFY_TIMEOUT_MS = 4000;
export const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';

// ── Mail domain (DNS) ──────────────────────────────────────────────────────────

/** The whole MX + A/AAAA check; past it the domain is allowed (DNS timeout = allow). */
export const MAIL_DOMAIN_CHECK_TIMEOUT_MS = 3000;
export const DNS_RESOLVER_TRIES = 1;
export const DNS_NXDOMAIN_CODE = 'ENOTFOUND';
export const DNS_NO_DATA_CODE = 'ENODATA';
/** RFC 7505 "null MX": a single MX record whose exchange is the root. */
export const NULL_MX_EXCHANGES: ReadonlySet<string> = new Set(['', '.']);

// ── Redis counters (keys carry hashes, never an address or an IP) ──────────────

export const ANTI_ABUSE_KEY_PREFIX = 'auth:abuse:';
export const POW_CLAIM_KEY_PREFIX = `${ANTI_ABUSE_KEY_PREFIX}pow:`;
export const SIGNUP_GLOBAL_KEY = `${ANTI_ABUSE_KEY_PREFIX}signup:global`;
export const SIGNUP_FINGERPRINT_KEY_PREFIX = `${ANTI_ABUSE_KEY_PREFIX}signup:fp:`;
export const SIGNUP_DEVICE_ID_KEY_PREFIX = `${ANTI_ABUSE_KEY_PREFIX}signup:did:`;
export const LOGIN_FAILURE_IP_KEY_PREFIX = `${ANTI_ABUSE_KEY_PREFIX}login-fail:ip:`;
export const LOGIN_FAILURE_EMAIL_KEY_PREFIX = `${ANTI_ABUSE_KEY_PREFIX}login-fail:email:`;
export const SIGNUP_GLOBAL_WINDOW_SECONDS = 10 * 60;
export const SIGNUP_DEVICE_WINDOW_SECONDS = 24 * 60 * 60;
/** Same budget as the auth rate limiter: past it a command is skipped (fail open). */
export const ANTI_ABUSE_REDIS_TIMEOUT_MS = 250;

// ── Sign-in: bot checks after repeated failures ────────────────────────────────

export const LOGIN_BOT_CHECK_FAILURE_THRESHOLD = 5;
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;

// ── One trial per device / network ─────────────────────────────────────────────

export const NETWORK_TRIAL_LIMIT = 3;
export const NETWORK_TRIAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const IPV4_NETWORK_PREFIX_BITS = 24;
export const IPV6_NETWORK_PREFIX_BITS = 48;
export const IPV6_HEXTET_COUNT = 8;
export const IPV6_NETWORK_HEXTETS = 3;
export const IPV4_NETWORK_OCTETS = 3;

// ── Admin linked accounts ──────────────────────────────────────────────────────

export const LINKED_ACCOUNTS_LIMIT = 100;
export const LINKED_ACCOUNTS_USER_ID_MAX_LENGTH = 64;

// ── Refusal messages (for a log reader; the web client translates the code) ────

export const BOT_CHECK_REQUIRED_MESSAGE = 'A bot check is required';
export const BOT_CHECK_FAILED_MESSAGE = 'The bot check did not pass';
export const DISPOSABLE_EMAIL_MESSAGE = 'Disposable email addresses cannot be used';
export const EMAIL_DOMAIN_UNDELIVERABLE_MESSAGE = 'This email domain cannot receive mail';
export const SIGNUP_LIMITED_MESSAGE = 'Sign-ups are temporarily limited. Please try again later.';
export const EMAIL_FIELD = 'email';
export const SECURITY_EVENT_SERVICE_NAME = 'auth-service';

// ── Disposable domains ─────────────────────────────────────────────────────────

/**
 * Seen in the 2026-11-27 sign-up farm (or the families it rotated through) but
 * missing from the vendored upstream list. Add here, never to the vendored file,
 * so a refresh of that file cannot drop them.
 */
export const INCIDENT_DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  'appolomail.com',
  'emailnox.live',
  'scanue.com',
  'temp-mail.io',
];

export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  ...VENDORED_DISPOSABLE_EMAIL_DOMAINS,
  ...INCIDENT_DISPOSABLE_EMAIL_DOMAINS,
]);
