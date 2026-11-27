import type { CaptchaKeys } from './bot-check.types';

/** The numeric knobs, each already clamped to its bounds or defaulted. */
export type SecurityNumberSettings = {
  recaptchaMinScore: number;
  powDifficulty: number;
  signupMaxPer10Min: number;
  signupMaxPerDevicePerDay: number;
};

/** The admin email-domain lists, parsed (lowercase, no leading `@` or `.`). */
export type SecurityDomainLists = {
  blockedDomains: readonly string[];
  allowedDomains: readonly string[];
};

/**
 * Every anti-abuse knob, resolved once per read: SystemSetting first, then the
 * environment (captcha keys only), then the built-in default. A captcha provider
 * is `null` unless both of its keys resolved.
 */
export type SecuritySettings = SecurityNumberSettings &
  SecurityDomainLists & {
    turnstile: CaptchaKeys | null;
    recaptcha: CaptchaKeys | null;
  };
