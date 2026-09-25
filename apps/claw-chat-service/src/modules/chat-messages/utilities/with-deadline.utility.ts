/**
 * Resolves with `work`, or rejects once `deadlineMs` passes — whichever comes
 * first. The timer is always cleared, so a fast answer leaves nothing behind.
 * `work` is not cancelled; the caller only stops waiting for it.
 */
export async function withDeadline<T>(
  work: Promise<T>,
  deadlineMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} exceeded ${String(deadlineMs)} ms`));
    }, deadlineMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
