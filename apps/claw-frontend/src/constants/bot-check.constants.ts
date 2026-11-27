/**
 * Sign-up and sign-in bot checks (security incident 2026-11-27): built-in proof
 * of work, Cloudflare Turnstile and Google reCAPTCHA v3. The two third-party
 * scripts load only on the sign-up and sign-in pages, and only once an admin
 * has saved their keys (the config endpoint returns `null` otherwise).
 */

/** Turnstile in explicit-render mode: the widget is placed by our code, never auto-scanned. */
export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** reCAPTCHA v3. The site key is appended as `?render=<siteKey>`. */
export const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';

/**
 * Content-Security-Policy sources the two bot checks need (Cloudflare's and
 * Google's documented lists). script-src matters in development and in CSP2
 * browsers; production CSP3 trusts the loader through 'strict-dynamic'.
 * frame-src always matters: both render their challenge in an iframe.
 */
export const BOT_CHECK_CSP_SCRIPT_SOURCES: ReadonlyArray<string> = [
  'https://challenges.cloudflare.com',
  'https://www.google.com/recaptcha/',
  'https://www.gstatic.com/recaptcha/',
];
export const BOT_CHECK_CSP_FRAME_SOURCES: ReadonlyArray<string> = [
  'https://challenges.cloudflare.com',
  'https://www.google.com/recaptcha/',
  'https://recaptcha.google.com',
];

/** DOM ids of the injected script tags, so a second mount reuses the first load. */
export const TURNSTILE_SCRIPT_ID = 'claw-turnstile-script';
export const RECAPTCHA_SCRIPT_ID = 'claw-recaptcha-script';

/**
 * The proof-of-work solver. Plain JS served same-origin from `public/` (like
 * `public/worklets/`), so it is never part of a page bundle and loads only when
 * a sign-up or a challenged sign-in needs it. `worker-src 'self'` covers it.
 */
export const POW_WORKER_URL = '/workers/pow-solver.js';

/** Hashes computed concurrently per round; enough to keep crypto.subtle busy. */
export const POW_BATCH_SIZE = 256;

/**
 * Hard stop for one solve. Difficulty 24 needs ~16.7 M hashes on average, so
 * 2^28 attempts is ~16x the mean of the hardest allowed setting; past that the
 * challenge is unsolvable in practice and the form submits without it.
 */
export const POW_MAX_ATTEMPTS = 268_435_456;

/** How long a third-party script may take to load before that check is skipped. */
export const BOT_CHECK_SCRIPT_TIMEOUT_MS = 15_000;

/**
 * How long a submit waits for a Turnstile token. Long, because a managed
 * challenge can ask the person to tick a box.
 */
export const TURNSTILE_TOKEN_TIMEOUT_MS = 60_000;

/** How long a submit waits for reCAPTCHA to become ready and answer. */
export const RECAPTCHA_EXECUTE_TIMEOUT_MS = 15_000;

/** How long the bot-check config is reused before it is asked for again. */
export const BOT_CHECK_CONFIG_STALE_MS = 60_000;

/** HTTP 428 Precondition Required: the server wants bot checks on this request. */
export const HTTP_PRECONDITION_REQUIRED = 428;

/** localStorage key of the random per-browser device id (not a secret). */
export const DEVICE_ID_STORAGE_KEY = 'claw.device-id';

/** Text drawn into the fingerprint canvas; fonts and anti-aliasing differ per device. */
export const DEVICE_CANVAS_TEXT = 'ClawAI device check 2026 \u{1F512}';

/** Canvas size for the fingerprint drawing. Small, so it costs nothing to render. */
export const DEVICE_CANVAS_WIDTH = 240;
export const DEVICE_CANVAS_HEIGHT = 60;

/** WEBGL_debug_renderer_info enums (UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL). */
export const WEBGL_UNMASKED_VENDOR = 0x9245;
export const WEBGL_UNMASKED_RENDERER = 0x9246;

/** Copy for the two bot-check refusals, shared by the sign-up and sign-in forms. */
export const BOT_CHECK_COPY_KEYS = {
  checking: 'auth.botCheck.checking',
  requiredTitle: 'auth.botCheck.requiredTitle',
  requiredDescription: 'auth.botCheck.requiredDescription',
  failedTitle: 'auth.botCheck.failedTitle',
  failedDescription: 'auth.botCheck.failedDescription',
  disposableEmail: 'auth.botCheck.disposableEmail',
  emailUndeliverable: 'auth.botCheck.emailUndeliverable',
  widgetLabel: 'auth.botCheck.widgetLabel',
} as const;

/** "Sign-ups are paused" copy, with the server's Retry-After in minutes. */
export const SIGNUP_LIMITED_COPY_KEYS = {
  title: 'auth.botCheck.signupLimitedTitle',
  inMinutes: 'auth.botCheck.signupLimitedInMinutes',
  inOneMinute: 'auth.botCheck.signupLimitedInOneMinute',
  fallback: 'auth.botCheck.signupLimitedFallback',
} as const;
