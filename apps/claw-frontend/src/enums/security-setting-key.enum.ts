/**
 * The SystemSetting keys the admin "Sign-up protection" page edits. Values are
 * the exact keys the auth-service reads; secrets are write-only (a read returns
 * '' plus `configured`).
 */
export enum SecuritySettingKey {
  TURNSTILE_SITE_KEY = 'security.turnstile.siteKey',
  TURNSTILE_SECRET_KEY = 'security.turnstile.secretKey',
  RECAPTCHA_SITE_KEY = 'security.recaptcha.siteKey',
  RECAPTCHA_SECRET_KEY = 'security.recaptcha.secretKey',
  RECAPTCHA_MIN_SCORE = 'security.recaptcha.minScore',
  POW_DIFFICULTY = 'security.pow.difficulty',
  EMAIL_BLOCKED_DOMAINS = 'security.email.blockedDomains',
  EMAIL_ALLOWED_DOMAINS = 'security.email.allowedDomains',
  SIGNUP_MAX_PER_10_MIN = 'security.signup.maxPer10Min',
  SIGNUP_MAX_PER_DEVICE_PER_DAY = 'security.signup.maxPerDevicePerDay',
}
