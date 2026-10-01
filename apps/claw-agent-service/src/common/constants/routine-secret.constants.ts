/**
 * F099 step 2: per-routine secrets a routine can read.
 *
 * Isolation rests on three things at once: every query is scoped by routine AND
 * owner, the ciphertext is bound to routine + owner + name through AES-GCM AAD,
 * and a secret is handed out only to the runner that claimed the routine's job.
 */

/** Upper-case env-style names: they become environment variables on the runner. */
export const ROUTINE_SECRET_NAME_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
export const ROUTINE_SECRET_NAME_MAX = 64;

/** Value limit in UTF-8 bytes, not characters. */
export const ROUTINE_SECRET_VALUE_MAX_BYTES = 8192;
export const ROUTINE_SECRET_MAX_PER_ROUTINE = 20;

/** Domain-separation label for the AAD, so the same key cannot decrypt another use. */
export const ROUTINE_SECRET_AAD_LABEL = 'claw.agent.routine.secret.v1';

/**
 * Names a runner must never export from a routine secret: they would let a stored
 * value change how the runner process loads code or finds binaries. Matched exactly,
 * plus the CLAW_ prefix (the runner's own configuration) and DYLD_ / LD_ families.
 */
export const ROUTINE_SECRET_RESERVED_NAMES: readonly string[] = [
  'PATH',
  'HOME',
  'SHELL',
  'IFS',
  'ENV',
  'BASH_ENV',
  'NODE_OPTIONS',
  'NODE_PATH',
  'NODE_EXTRA_CA_CERTS',
  'PYTHONPATH',
  'PYTHONSTARTUP',
  'GIT_SSH_COMMAND',
  'GIT_EXEC_PATH',
];
export const ROUTINE_SECRET_RESERVED_PREFIXES: readonly string[] = ['CLAW_', 'LD_', 'DYLD_'];

/** Replaces a secret value found in a job's reported output. */
export const ROUTINE_SECRET_REDACTION_MARKER = '[REDACTED]';

/** Values shorter than this are not scrubbed from output: they are not credentials and would mangle it. */
export const ROUTINE_SECRET_SCRUB_MIN_CHARS = 4;
