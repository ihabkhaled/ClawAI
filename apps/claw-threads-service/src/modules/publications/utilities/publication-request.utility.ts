import type { Request } from 'express';

export function userAgentOf(request: Request): string | undefined {
  const value = request.headers['user-agent'];
  return typeof value === 'string' ? value : undefined;
}

/** The address behind nginx, then the socket address. */
export function clientAddress(request: Request, fallback: string): string {
  const forwarded = request.headers['x-real-ip'];
  return typeof forwarded === 'string' && forwarded.trim() !== '' ? forwarded.trim() : fallback;
}
