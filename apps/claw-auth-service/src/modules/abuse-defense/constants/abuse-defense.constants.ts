import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';

// ── SystemSetting keys (admin-editable, read through SystemSettingService, ADR-233) ─────
// Under `security.` so they use the camelCase key rule and can be cleared (empty = default).

export const ABUSE_SETTING_AUTO_SUSPEND_ENABLED = 'security.abuse.autoSuspendEnabled';
export const ABUSE_SETTING_WINDOW_MINUTES = 'security.abuse.windowMinutes';
export const ABUSE_SETTING_RATE_LIMIT_TRIPS = 'security.abuse.rateLimitTrips';
export const ABUSE_SETTING_FORBIDDEN_PROBES = 'security.abuse.forbiddenProbes';
export const ABUSE_SETTING_SSRF_REFUSALS = 'security.abuse.ssrfRefusals';
export const ABUSE_SETTING_FIRST_SUSPENSION_MINUTES = 'security.abuse.firstSuspensionMinutes';
export const ABUSE_SETTING_SECOND_SUSPENSION_MINUTES = 'security.abuse.secondSuspensionMinutes';
export const ABUSE_SETTING_THIRD_SUSPENSION_MINUTES = 'security.abuse.thirdSuspensionMinutes';
export const ABUSE_SETTING_ESCALATION_DAYS = 'security.abuse.escalationWindowDays';

// ── Defaults (conservative: a normal heavy user never reaches them) and bounds ─────────
// A value outside its bounds, or absent, reads as the default.

/** ON by default. OFF records every signal and suspends nobody. */
export const DEFAULT_AUTO_SUSPEND_ENABLED = true;

/** Signals are counted in a fixed window of this many minutes. */
export const DEFAULT_WINDOW_MINUTES = 15;
export const WINDOW_MINUTES_MIN = 1;
export const WINDOW_MINUTES_MAX = 1440;

/** 429s on authenticated routes in one window: sustained hammering, not a stuck client. */
export const DEFAULT_RATE_LIMIT_TRIPS = 300;
/** Role or permission refusals in one window: probing, not one stale button. A polling bug does about 10 an hour. */
export const DEFAULT_FORBIDDEN_PROBES = 200;
/** URLs the SSRF guards refused in one window: one is a typo, ten is a scan. */
export const DEFAULT_SSRF_REFUSALS = 10;
export const THRESHOLD_MIN = 1;
export const THRESHOLD_MAX = 1_000_000;

/** The ladder: first 1 hour, then 24 hours, then 7 days. A permanent ban is only ever an administrator's. */
export const DEFAULT_FIRST_SUSPENSION_MINUTES = 60;
export const DEFAULT_SECOND_SUSPENSION_MINUTES = 24 * 60;
export const DEFAULT_THIRD_SUSPENSION_MINUTES = 7 * 24 * 60;
export const SUSPENSION_MINUTES_MIN = 1;
export const SUSPENSION_MINUTES_MAX = 365 * 24 * 60;

/** A suspension older than this no longer counts towards the next rung. */
export const DEFAULT_ESCALATION_DAYS = 30;
export const ESCALATION_DAYS_MIN = 1;
export const ESCALATION_DAYS_MAX = 365;

/** The rungs of the ladder; the third repeats for every later suspension. */
export const SUSPENSION_LEVEL_FIRST = 1;
export const SUSPENSION_LEVEL_SECOND = 2;
export const SUSPENSION_LEVEL_MAX = 3;

// ── Which codes count, and where their threshold lives ──────────────────────────────────

/** Codes the internal route accepts from another service. The two UNCOUNTED codes are auth-service's own. */
export const REPORTABLE_SIGNAL_CODES: readonly AbuseSignalCode[] = [
  AbuseSignalCode.RATE_LIMIT_TRIPPED,
  AbuseSignalCode.FORBIDDEN_PROBE,
  AbuseSignalCode.SSRF_REFUSED,
];

/** The codes that can suspend an account. Everything else is evidence for an administrator. */
export const COUNTED_SIGNAL_CODES: readonly AbuseSignalCode[] = REPORTABLE_SIGNAL_CODES;

export const REPORT_SOURCE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,39}$/u;
export const USER_ID_MAX_LENGTH = 64;

/** `source` of a signal the auth-service raised itself. */
export const SOURCE_AUTH_HTTP = 'auth.http';
export const SOURCE_AUTH_REFRESH = 'auth.refresh';
export const SOURCE_AUTH_SIGNIN = 'auth.signin';

// ── Storage ─────────────────────────────────────────────────────────────────────────────

export const ABUSE_KEY_PREFIX = 'auth:abuse:sig:';
export const ABUSE_PERSIST_KEY_PREFIX = 'auth:abuse:sig-persist:';
export const ABUSE_SUSPEND_LOCK_KEY_PREFIX = 'auth:abuse:sig-suspend:';
/** At most one stored bucket per (user, code) per this many seconds, however many signals arrive. */
export const ABUSE_PERSIST_INTERVAL_SECONDS = 60;
export const ABUSE_SUSPEND_LOCK_SECONDS = 60;
export const BUCKET_MS = 60_000;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Written to users.ban_reason by an automatic suspension; what the admin list and the ban gate recognise. */
export const AUTO_SUSPENSION_REASON_PREFIX = 'AUTO_ABUSE:';
/** The actor named on the events an automatic suspension publishes. */
export const ABUSE_SYSTEM_ACTOR = 'system:abuse-defence';
export const ABUSE_AUDIT_SERVICE_NAME = 'auth-service';

// ── Admin read bounds ───────────────────────────────────────────────────────────────────

export const ADMIN_SIGNAL_LIMIT = 50;
export const ADMIN_SUSPENSION_LIMIT = 20;
