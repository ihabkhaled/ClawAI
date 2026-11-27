/**
 * Settles with the promise's value, or with `null` once `timeoutMs` passes or
 * the promise rejects. For best-effort steps (a third-party token, a script
 * load) where waiting forever, or failing the whole flow, is worse than going
 * on without the value.
 */
export function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}
