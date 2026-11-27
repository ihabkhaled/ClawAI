import type { TrialDecisionReason } from '../enums/trial-decision-reason.enum';
import type { BotCheckInput } from './bot-check.types';

/** The optional client signals; accepted and bounded, never stored. */
export type DeviceSignals = {
  tz?: string;
  lang?: string;
  platform?: string;
  screen?: string;
  cores?: number;
  memory?: number;
  webgl?: string;
  touch?: boolean;
};

/** The `device` object of a register or login body (raw values, never stored). */
export type DeviceInput = {
  fingerprint: string;
  deviceId: string;
  signals?: DeviceSignals;
};

/** A device after peppered hashing: the only form that is stored or compared. */
export type HashedDevice = {
  fingerprintHash: string;
  deviceIdHash: string;
};

/** Where a register or login request came from. All null when unknown. Personal data. */
export type ScreeningOrigin = {
  ip: string | null;
  countryCode: string | null;
  userAgent: string | null;
};

/** Whether a new account gets the free trial, and why. */
export type TrialDecision = {
  grant: boolean;
  reason: TrialDecisionReason;
};

/** What sign-up screening hands to account creation once every check passed. */
export type RegistrationVerdict = {
  device: HashedDevice | null;
  trial: TrialDecision;
};

/** The anti-abuse half of a login body. */
export type LoginScreeningInput = {
  botCheck?: BotCheckInput;
  device?: DeviceInput;
};

/** What sign-up screening reads from a register body (a RegisterDto fits). */
export type RegistrationScreeningInput = LoginScreeningInput & {
  email: string;
};

/** One `user_devices` upsert. */
export type DeviceRecordInput = {
  userId: string;
  device: HashedDevice;
  origin: ScreeningOrigin;
  seenAt: Date;
};
