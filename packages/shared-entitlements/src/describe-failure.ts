/**
 * Turns an entitlements failure into something an operator can act on.
 *
 * Every caller wraps `getEntitlements` in a catch that throws
 * `ENTITLEMENTS_UNAVAILABLE`, and those catches used to discard the reason
 * entirely. A 503 that says only "temporarily unavailable" is indistinguishable
 * between a timeout, a refused connection, a DNS failure and a 500 from
 * auth-service — four different faults with four different fixes — so the
 * intermittent ones could not be diagnosed at all.
 *
 * `fetch` reports transport faults as a bare `TypeError: fetch failed` with the
 * real code hidden on `.cause`, and an aborted request surfaces as `AbortError`
 * rather than as anything mentioning the timeout that caused it. Both are
 * unwrapped here so the log line names the actual fault.
 */
export function describeEntitlementsFailure(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `timed out after ${String(timeoutMs)}ms`;
  }

  if (error instanceof Error) {
    const cause: unknown = (error as { cause?: unknown }).cause;
    const causeCode =
      typeof cause === 'object' && cause !== null && 'code' in cause
        ? String((cause as { code: unknown }).code)
        : null;
    // "fetch failed" on its own says nothing; the cause carries ECONNREFUSED,
    // ENOTFOUND, UND_ERR_SOCKET and friends.
    return causeCode === null ? error.message : `${error.message} (${causeCode})`;
  }

  return 'unknown error';
}
