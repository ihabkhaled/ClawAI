import { hashRateLimitPart } from '../../auth/utilities/auth-rate-limit-key.utility';
import {
  ABUSE_KEY_PREFIX,
  ABUSE_PERSIST_KEY_PREFIX,
  ABUSE_SUSPEND_LOCK_KEY_PREFIX,
} from '../constants/abuse-defense.constants';
import type { AbuseSignalCode } from '../enums/abuse-signal-code.enum';

// The user id is SHA-256 hashed in every key (the same rule as every other auth counter):
// a Redis keyspace dump must not be a list of who tripped what.

/** The fixed window counting one code for one account. */
export function abuseSignalKey(userId: string, code: AbuseSignalCode): string {
  return `${ABUSE_KEY_PREFIX}${code}:${hashRateLimitPart(userId)}`;
}

/** Claimed once a minute per (account, code): the gate that bounds database writes. */
export function abusePersistKey(userId: string, code: AbuseSignalCode): string {
  return `${ABUSE_PERSIST_KEY_PREFIX}${code}:${hashRateLimitPart(userId)}`;
}

/** Claimed once when a threshold is crossed: two concurrent signals cannot suspend twice. */
export function abuseSuspendLockKey(userId: string): string {
  return `${ABUSE_SUSPEND_LOCK_KEY_PREFIX}${hashRateLimitPart(userId)}`;
}
