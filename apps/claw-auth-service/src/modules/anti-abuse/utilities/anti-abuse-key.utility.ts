import { hashRateLimitPart } from '../../auth/utilities/auth-rate-limit-key.utility';
import {
  LOGIN_FAILURE_EMAIL_KEY_PREFIX,
  LOGIN_FAILURE_IP_KEY_PREFIX,
  POW_CLAIM_KEY_PREFIX,
  SIGNUP_DEVICE_ID_KEY_PREFIX,
  SIGNUP_FINGERPRINT_KEY_PREFIX,
} from '../constants/anti-abuse.constants';
import type { HashedDevice } from '../types/device.types';

// Every key part that could identify a person is SHA-256 hashed (the same rule
// as the auth rate limiter): a Redis keyspace dump must not list who signs in.

/** The single-use claim of a proof-of-work salt (random, identifies nobody). */
export function powClaimKey(salt: string): string {
  return `${POW_CLAIM_KEY_PREFIX}${salt}`;
}

/** The per-IP failed-sign-in window; null when the request had no usable address. */
export function loginFailureIpKey(ip: string | null): string | null {
  return ip === null ? null : `${LOGIN_FAILURE_IP_KEY_PREFIX}${hashRateLimitPart(ip)}`;
}

/** The per-address failed-sign-in window (trim + lowercase, like the rate limiter). */
export function loginFailureEmailKey(email: string): string {
  return `${LOGIN_FAILURE_EMAIL_KEY_PREFIX}${hashRateLimitPart(email.trim().toLowerCase())}`;
}

/** The two per-device sign-up windows. The hashes are already peppered. */
export function signupDeviceKeys(device: HashedDevice): string[] {
  return [
    `${SIGNUP_FINGERPRINT_KEY_PREFIX}${device.fingerprintHash}`,
    `${SIGNUP_DEVICE_ID_KEY_PREFIX}${device.deviceIdHash}`,
  ];
}
