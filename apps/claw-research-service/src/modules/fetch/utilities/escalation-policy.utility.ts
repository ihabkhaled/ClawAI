import { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import { FetchStrategyKind } from '../../../generated/prisma';
import {
  STRATEGIES_RENDERING_JAVASCRIPT,
  STRATEGIES_TOUCHING_ORIGIN,
} from '../constants/fetch-strategy.constants';

/**
 * The rules of the escalation chain, as one pure function (ADR-121 §3).
 *
 * The chain exists to get past TECHNICAL obstacles — a TLS fingerprint rule,
 * a JavaScript interstitial, a page that only exists after its own scripts
 * run. It must never be a way around a REFUSAL. So:
 *
 * - 401/407 (credentials) and 451 (legal) end the chain. Nothing runs after.
 * - A captcha, a 429, a dead page (404/410/unresolvable) or an unreachable
 *   robots.txt leaves only the public archive: solving captchas is out,
 *   hammering a host that asked us to slow down with a different client is
 *   out, a live fetch of a page that does not exist cannot succeed, and RFC
 *   9309 says an unreachable robots.txt means the origin is off limits.
 * - FlareSolverr runs only after a JS interstitial was actually seen.
 * - After an empty client-rendered shell, a non-rendering client that
 *   touches the origin cannot help, so it is skipped.
 *
 * robots.txt is not here: it is checked before the chain starts, and a
 * disallowed URL never reaches this function.
 */
export function isStrategyEligible(
  kind: FetchStrategyKind,
  observed: ReadonlySet<BlockSignalKind>,
): boolean {
  if (hasTerminalSignal(observed)) {
    return false;
  }
  if (
    observed.has(BlockSignalKind.CAPTCHA) ||
    observed.has(BlockSignalKind.RATE_LIMITED) ||
    observed.has(BlockSignalKind.NOT_FOUND) ||
    observed.has(BlockSignalKind.ROBOTS_UNREACHABLE)
  ) {
    return kind === FetchStrategyKind.ARCHIVE_SNAPSHOT;
  }
  if (kind === FetchStrategyKind.FLARESOLVERR) {
    return observed.has(BlockSignalKind.JS_CHALLENGE);
  }
  if (kind === FetchStrategyKind.ARCHIVE_SNAPSHOT && onlyThinnessObserved(observed)) {
    // An old copy is a remedy for a page we cannot reach, not for one that
    // rendered short: the live thin result is returned instead.
    return false;
  }
  if (
    observed.has(BlockSignalKind.EMPTY_JS_SHELL) &&
    STRATEGIES_TOUCHING_ORIGIN.has(kind) &&
    !STRATEGIES_RENDERING_JAVASCRIPT.has(kind)
  ) {
    return false;
  }
  return true;
}

function onlyThinnessObserved(observed: ReadonlySet<BlockSignalKind>): boolean {
  return (
    observed.size > 0 && [...observed].every((signal) => signal === BlockSignalKind.EMPTY_JS_SHELL)
  );
}

/** True when a signal means the site refused, and the whole chain must stop. */
export function hasTerminalSignal(observed: ReadonlySet<BlockSignalKind>): boolean {
  return (
    observed.has(BlockSignalKind.AUTH_REQUIRED) || observed.has(BlockSignalKind.LEGAL_UNAVAILABLE)
  );
}
