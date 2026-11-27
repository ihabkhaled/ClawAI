import { createHmac } from 'node:crypto';

import { FINGERPRINT_LOG_PREFIX_LENGTH } from '../constants/anti-abuse.constants';
import type { DeviceInput, HashedDevice } from '../types/device.types';

/** HMAC-SHA256 under the server pepper, hex. The raw value is never stored or logged. */
export function hashDeviceValue(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

/** Both device identifiers, peppered. No device object means nothing to hash. */
export function hashDevice(device: DeviceInput | undefined, pepper: string): HashedDevice | null {
  if (device === undefined) {
    return null;
  }
  return {
    fingerprintHash: hashDeviceValue(device.fingerprint.toLowerCase(), pepper),
    deviceIdHash: hashDeviceValue(device.deviceId, pepper),
  };
}

/** What a security event may carry of a fingerprint: 8 characters of its PEPPERED hash. */
export function fingerprintLogPrefix(fingerprintHash: string | null): string | null {
  return fingerprintHash === null ? null : fingerprintHash.slice(0, FINGERPRINT_LOG_PREFIX_LENGTH);
}
