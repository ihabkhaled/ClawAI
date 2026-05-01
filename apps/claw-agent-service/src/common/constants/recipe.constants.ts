import { CapabilityBlastRadius } from '../enums/capability-blast-radius.enum';
import { CapabilityReversibility } from '../enums/capability-reversibility.enum';

/**
 * Recipe engine defaults (Stream 13).
 */
export const RECIPE_MAX_STEPS_PER_RUN_DEFAULT = 100;

export const RECIPE_MAX_PARALLEL_STEPS_DEFAULT = 5;

export const RECIPE_DEFAULT_STEP_TIMEOUT_MS_DEFAULT = 60_000;

export const RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT = 600_000;

export const RECIPE_MIN_PARSER_INTERVAL_MS = 5 * 60 * 1000;

export const RECIPE_PARAM_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export const RECIPE_DSL_SCHEMA_VERSION = '1';

export const RECIPE_PATH_REGEX =
  /^\$(params|steps)\.[a-zA-Z_][a-zA-Z0-9_-]*(\.[a-zA-Z_][a-zA-Z0-9_-]*|\.\d+)*/;

/**
 * Default blast radius / reversibility used by the recipe runner when
 * the DSL step does not declare them. Conservative defaults — most
 * non-trivial steps should override these on a per-step basis.
 */
export const RECIPE_DEFAULT_BLAST: CapabilityBlastRadius =
  CapabilityBlastRadius.SINGLE_RESOURCE;

export const RECIPE_DEFAULT_REVERSIBILITY: CapabilityReversibility =
  CapabilityReversibility.COMPENSATABLE;

/**
 * Regexes for the recipe placeholder resolver — kept here so the utility
 * file does not declare top-level constants.
 */
export const PATH_PREFIX_REGEX = /^\$(params|steps)\./;

export const ESCAPED_PREFIX_REGEX = /^\$\$/;

/**
 * v2 runner — hard wall-clock cap for a single run before the timeout
 * sweeper auto-fails it. 10 minutes default; tunable via env later.
 */
export const RECIPE_RUN_TIMEOUT_SWEEP_INTERVAL_MS = 60_000; // every 1 minute

/**
 * v2 runner — minimum spacing between retry attempts on a single step.
 * Even if the DSL declares backoffMs=0, we floor at 100ms so a
 * pathological retry loop can't peg a CPU.
 */
export const RECIPE_STEP_RETRY_FLOOR_MS = 100;

export const RECIPE_STEP_RETRY_CEILING_MS = 60_000;
