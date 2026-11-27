import type { EmailDomainReason } from '../enums/email-domain-reason.enum';
import type { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';
import type { SecurityKeySource } from '../enums/security-key-source.enum';

/** One captcha provider as it is in force right now. Never carries a secret. */
export type CaptchaProviderStatus = {
  active: boolean;
  /** The effective site key (public), or null when none resolves. */
  siteKey: string | null;
  siteKeySource: SecurityKeySource;
  secretKeySource: SecurityKeySource;
};

/** `GET /admin/security/sign-up/status`: what the sign-up protection page cannot read from the settings rows. */
export type SignupProtectionStatus = {
  turnstile: CaptchaProviderStatus;
  recaptcha: CaptchaProviderStatus;
  builtInDisposableDomainCount: number;
};

/** `GET /admin/security/sign-up/email-check`: the verdict a sign-up with this domain would get, and why. */
export type EmailDomainExplanation = {
  domain: string;
  verdict: EmailDomainVerdict;
  reason: EmailDomainReason;
};
