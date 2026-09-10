import { LOG_LEVEL_RANK } from '@/constants';
import type { LogLevel } from '@/enums';

/**
 * Whether a log level is allowed to cross the network.
 *
 * A named function taking its floor as an argument, rather than a private
 * closure reading a module constant. The constant is resolved from `NODE_ENV`
 * at module load, so a test could only reach the closure by resetting the
 * module registry and re-importing the logger per case — slow, and it leaked
 * state between cases when one timed out. The rule itself is worth naming: it
 * is the reason 45 `logger.debug` call sites cost nothing in production.
 *
 * `LogLevel` is an unordered string enum, so the comparison needs
 * `LOG_LEVEL_RANK`. That is why there was no gate at all before.
 */
export function passesSeverityGate(level: LogLevel, minimumLevel: LogLevel): boolean {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[minimumLevel];
}
