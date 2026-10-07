import { HttpException } from '@nestjs/common';

/**
 * The text of an error is only kept when this service wrote it (an HttpException it
 * threw). Anything else, such as a database, network or provider error, can carry
 * hostnames, query text or upstream output, so only its class name survives. The
 * result feeds the log line and the admin ticket for a failed job.
 */
function describe(error: Error): string {
  const text = error instanceof HttpException ? `: ${error.message.slice(0, 200)}` : '';
  return `${error.name}${text}`;
}

export function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return 'non-error thrown';
  const cause = error.cause instanceof Error ? ` <- ${describe(error.cause)}` : '';
  return `${describe(error)}${cause}`;
}
