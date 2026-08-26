import type { WebhookJsonBody } from '../types/workspace-event.types';

/** Narrows a parsed webhook body to a record, treating a top-level array as empty. */
export function asRecord(body: WebhookJsonBody): Record<string, unknown> {
  return Array.isArray(body) ? {} : body;
}

export function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function bool(value: unknown): boolean {
  return value === true;
}

export function parseDate(value: unknown): Date | null {
  const s = str(value);
  if (s === null) return null;
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
