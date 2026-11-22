/** A loggable message for an unknown thrown value. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
