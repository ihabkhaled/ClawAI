/** The message of an error for a log line; never the error object, so no payload leaks into logs. */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
