import type { HttpStatus } from '@nestjs/common';

/**
 * The body of an HTTP error that carries a machine code, in the shape the other services use
 * (`message`, `code`, `statusCode`) so the frontend reads `code` the same way everywhere.
 * `details` holds only the caller's own request fields (role, provider, model, plan).
 */
export function codedErrorBody(
  message: string,
  code: string,
  statusCode: HttpStatus,
  details: Readonly<Record<string, string | number>> = {},
): Record<string, string | number> {
  return { ...details, message, code, statusCode };
}
