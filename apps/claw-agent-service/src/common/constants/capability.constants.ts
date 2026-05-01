/**
 * Capability framework defaults (Stream 10).
 *
 * Read by AppConfig (Zod-validated) and by services that respect these
 * values directly. Env-overridable via CAPABILITY_QUEUE_EXPIRY_MINUTES,
 * CAPABILITY_RISK_AUTO_APPROVE_MAX, CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE.
 */
export const CAPABILITY_QUEUE_EXPIRY_MINUTES_DEFAULT = 60;

export const CAPABILITY_RISK_AUTO_APPROVE_MAX_DEFAULT = 25;

export const CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE_DEFAULT = true;

export const CAPABILITY_EXPIRY_SWEEPER_CRON_DEFAULT = '*/5 * * * *';

/**
 * Risk-score scoring weights (heuristic; policies override).
 */
export const RISK_WEIGHT_BLAST_SYSTEM = 20;
export const RISK_WEIGHT_BLAST_USER_OR_EXTERNAL = 15;
export const RISK_WEIGHT_REVERSIBILITY_IRREVERSIBLE = 20;
export const RISK_WEIGHT_REVERSIBILITY_COMPENSATABLE = 10;
export const RISK_WEIGHT_PER_SECRET_PATTERN = 10;
export const RISK_WEIGHT_PER_PII_PATTERN = 5;
export const RISK_WEIGHT_NEW_DEVICE = 10;
export const RISK_WEIGHT_NEW_USER_THIS_CLASS = 5;
export const RISK_NEW_DEVICE_AGE_DAYS_THRESHOLD = 7;
export const RISK_NEW_USER_THIS_CLASS_COUNT_THRESHOLD = 30;

/**
 * Risk-label thresholds — shared across class.
 *
 * 0–24   = LOW
 * 25–54  = MEDIUM
 * 55–79  = HIGH
 * 80–100 = CRITICAL
 */
export const RISK_LABEL_THRESHOLDS = {
  LOW_MAX: 24,
  MEDIUM_MAX: 54,
  HIGH_MAX: 79,
} as const;

/**
 * Hard timeout for a capability marked EXECUTING — beyond this it is
 * auto-failed by the expiry sweeper (separate from PENDING_APPROVAL
 * expiry).
 */
export const CAPABILITY_EXECUTING_HARD_TIMEOUT_MINUTES = 5;

/**
 * Expiry sweeper cadence — runs every 5 minutes.
 */
export const CAPABILITY_EXPIRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Env flag name controlling dual-write soak window from the legacy
 * CommandRiskService into CapabilityRiskService. Default-on.
 */
export const CAPABILITY_DUAL_WRITE_FLAG_ENV =
  'CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE';
