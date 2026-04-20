import { type Request } from 'express';

/**
 * Extracts the raw bearer token from the Authorization header on an
 * incoming request. Returns an empty string if no bearer is present.
 * Used when a service needs to forward the caller's identity to another
 * service (e.g. chat-service → research-service).
 */
export function extractBearer(req: Request): string {
  const header = req.headers['authorization'];
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return '';
  }
  return header.slice(7);
}
