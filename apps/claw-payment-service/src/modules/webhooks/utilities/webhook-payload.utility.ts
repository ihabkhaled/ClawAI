import { createHash } from 'node:crypto';

import {
  WEBHOOK_EVENT_ID_MAX_LENGTH,
  WEBHOOK_EVENT_TYPE_MAX_LENGTH,
} from '../constants/webhook.constants';

/**
 * SHA-256 of the exact bytes the gateway sent.
 *
 * Hashing rather than storing is the point: it proves duplicate delivery and
 * lets an operator confirm two deliveries were identical, without keeping a
 * payload that may contain payer name, email or address indefinitely.
 */
export function hashWebhookPayload(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

/**
 * Narrows an untrusted value to a bounded, non-empty string.
 *
 * Takes the VALUE rather than an (object, key) pair on purpose: callers index
 * with a literal, which keeps a dynamic key off an attacker-controlled object.
 * Returns null rather than throwing, so a malformed webhook becomes a recorded
 * IGNORED event instead of an exception the gateway will retry forever.
 */
export function asBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return null;
  }
  return value;
}

export function asBoundedIdentifier(value: unknown, maxLength: number): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    const identifier = String(value);
    return identifier.length <= maxLength ? identifier : null;
  }
  return asBoundedString(value, maxLength);
}

export function asEventId(value: unknown): string | null {
  return asBoundedString(value, WEBHOOK_EVENT_ID_MAX_LENGTH);
}

export function asEventType(value: unknown): string | null {
  return asBoundedString(value, WEBHOOK_EVENT_TYPE_MAX_LENGTH);
}

/**
 * Narrows an untrusted value to a plain object, or null.
 *
 * Arrays are rejected: `typeof [] === 'object'` would otherwise let an array
 * through as a record and produce undefined reads downstream.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Parses a raw webhook body into a plain object, or null.
 *
 * A body that is not a JSON object is not an error worth throwing over — it is
 * simply something we cannot act on, and it gets recorded as such.
 */
export function parseWebhookBody(rawBody: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(rawBody));
  } catch {
    return null;
  }
}
