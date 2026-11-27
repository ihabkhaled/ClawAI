/** `auth.botCheck.*`: the browser check and the anti-abuse refusals on sign-up and sign-in. */
export type BotCheckAuthTranslation = {
  checking: string;
  widgetLabel: string;
  requiredTitle: string;
  requiredDescription: string;
  failedTitle: string;
  failedDescription: string;
  disposableEmail: string;
  emailUndeliverable: string;
  signupLimitedTitle: string;
  signupLimitedInMinutes: string;
  signupLimitedInOneMinute: string;
  signupLimitedFallback: string;
};

/** `adminSecurity.*`: the admin "Sign-up protection" page and the linked-accounts view. */
export type AdminSecurityTranslation = {
  title: string;
  description: string;
  loading: string;
  loadFailed: string;
  readOnly: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  invalid: string;
  groups: {
    powTitle: string;
    powDescription: string;
    turnstileTitle: string;
    turnstileDescription: string;
    recaptchaTitle: string;
    recaptchaDescription: string;
    emailTitle: string;
    emailDescription: string;
    velocityTitle: string;
    velocityDescription: string;
  };
  fields: {
    siteKey: string;
    secretKey: string;
    secretHelp: string;
    secretConfigured: string;
    secretNotConfigured: string;
    minScore: string;
    minScoreHelp: string;
    powDifficulty: string;
    powDifficultyHelp: string;
    blockedDomains: string;
    blockedDomainsHelp: string;
    allowedDomains: string;
    allowedDomainsHelp: string;
    maxPer10Min: string;
    maxPer10MinHelp: string;
    maxPerDevicePerDay: string;
    maxPerDevicePerDayHelp: string;
    defaultPlaceholder: string;
  };
  errors: {
    integerRange: string;
    scoreRange: string;
    domainList: string;
    tooLong: string;
  };
  linkedAccounts: {
    open: string;
    title: string;
    description: string;
    loading: string;
    loadFailed: string;
    empty: string;
    reasonDevice: string;
    reasonDeviceId: string;
    reasonRegistrationIp: string;
    banned: string;
    registered: string;
  };
};

export type AntiAbuseLocaleTranslation = {
  navigationLabel: string;
  auth: BotCheckAuthTranslation;
  admin: AdminSecurityTranslation;
};
