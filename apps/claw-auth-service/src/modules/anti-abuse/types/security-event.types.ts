import type { ScreeningOrigin } from './device.types';

/**
 * One anti-abuse security event. The email is reduced to its DOMAIN and the
 * fingerprint to an 8-character prefix of its peppered hash before anything is
 * written; neither the full address nor a raw fingerprint ever reaches a log.
 */
export type SecurityEventInput = {
  origin: ScreeningOrigin;
  email: string | null;
  fingerprintHash: string | null;
  code?: string;
  reason?: string;
  userId?: string;
};

/** The metadata block of the structured log line. */
export type SecurityEventMetadata = {
  ip: string | null;
  countryCode: string | null;
  userAgent: string | null;
  emailDomain: string | null;
  fingerprintPrefix: string | null;
  reason: string | null;
};
